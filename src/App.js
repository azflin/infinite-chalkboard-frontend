import './App.css';
import detectEthereumProvider from '@metamask/detect-provider';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import styled from 'styled-components'

import { abi } from "./abis/InfiniteChalkboard.json";
import MessageForm from './components/MessageForm';
import chalkboard from './chalkboard.png';
import { StyledButton } from "./components/MessageForm";
import { Status } from "./components/Status";

import { INFINITE_CHALKBOARD_ADDRESS, NETWORK } from "./config";

const Container = styled.div`
  max-width: 900px;
  margin: auto;
`
const BorderedDiv = styled.div`
  border: 2px solid white;
  border-radius: 20px;
  background-color: rgba(99, 95, 84, 0.7);
  margin-bottom: 15px;
`
const Dots = styled.span`
  &::after {
    display: inline-block;
    animation: ellipsis 1.25s infinite;
    content: ".";
    width: 1em;
    text-align: left;
  }
  @keyframes ellipsis {
    0% {
      content: ".";
    }
    33% {
      content: "..";
    }
    66% {
      content: "...";
    }
  }
`
const PastMessages = styled.div`
  background: rgba(38, 122, 59, 0.8);
  padding: 0 0 20px 20px;
  border: 2px solid white;
  border-radius: 20px;
  margin-bottom: 20px;
`

function App() {

  // Provider, signer, and address
  const [provider, setProvider] = useState();
  const [signer, setSigner] = useState();
  const [address, setAddress] = useState();

  // Contract variables
  const [contract, setContract] = useState();
  const [message, setMessage] = useState();
  const [author, setAuthor] = useState();
  const [cost, setCost] = useState();
  const [pastMessages, setPastMessages] = useState();

  // Various loading, status etc variables
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const [errorTransaction, setErrorTransaction] = useState("");
  const [metamaskInstalled, setMetamaskInstalled] = useState(false);
  const [wrongChain, setWrongChain] = useState(false);
  const [txHash, setTxHash] = useState();

  // Function to request metamask connection. This sets signer.
  const connectMetamask = async () => {
    if (provider) {
      try {
        let accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAddress(accounts[0]);
        setSigner(provider.getSigner());
      } catch {
        console.log("User rejected connection request.")
      }
    }
  }

  // Function to write message to blockchain
  const writeMessage = async (message) => {
    if (signer) {
      let txResponse;
      try {
        txResponse = await contract.connect(signer).write(message, {value: ethers.utils.parseEther(cost)});
      } catch {
        setErrorTransaction("RPC Error! Most likely someone wrote on the board since you loaded the page. Please refresh.");
        return;
      }
      setTxHash(txResponse.hash);
      setProcessingTransaction(true);
      let txReceipt;
      try {
        txReceipt = await txResponse.wait();
      } catch {
        setErrorTransaction("Transaction reverted! Someone probably wrote just before you.");
        setProcessingTransaction(false);
        return;
      }
      if (txReceipt.status === 1) {
        setMessage(txReceipt.events[0].args[0]);
        setAuthor(txReceipt.events[0].args[1]);
        setCost(ethers.utils.formatEther(txReceipt.events[0].args[2]));
      } else {
        console.log("Transaction receipt somehow has non 1 status.");
      }
      setProcessingTransaction(false);
    } else {
      alert("Connect through MetaMask first.");
    }
    
  }

  // On initial load, set the provider. If already connected, set address and signer as well.
  useEffect(() => {
    async function getProvider() {
      if (await detectEthereumProvider()) {
        setMetamaskInstalled(true);
        let p = new ethers.providers.Web3Provider(window.ethereum, "any");
        // Listen for chain changes
        p.on("network", (newNetwork, oldNetwork) => {
          // When a Provider makes its initial connection, it emits a "network"
          // event with a null oldNetwork along with the newNetwork. So, if the
          // oldNetwork exists, it represents a changing network
          if (oldNetwork) {
              window.location.reload();
          }
        });
        let chainId = (await p.getNetwork()).chainId;
        if (chainId !== NETWORK.chainId) {
          setWrongChain(true);
          return;
        }
        let accounts = await p.listAccounts();
        if (accounts.length) {
          setAddress(accounts[0]);
          setSigner(p.getSigner());
        }
        setProvider(p);
        // Listen for account changes
        window.ethereum.on("accountsChanged", (accounts) => {
          console.log("Accounts changed", accounts[0]);
          setAddress(accounts[0]);
        });
      }
    }
    getProvider();
  }, []);

  // Once we have a provider, instantiate the contract with provider. Set contract state variables and events.
  useEffect(() => {
    async function instantiateContract() {
      let c = new ethers.Contract(INFINITE_CHALKBOARD_ADDRESS, abi, provider)
      setContract(c);
      setMessage(await c.message());
      setCost(ethers.utils.formatEther(await c.cost()));
      setAuthor(await c.author());
    }
    if (provider) {
      instantiateContract();
    }
  }, [provider]);

  // Retrieve past messages. Depends on provider (first load of provider) & message (when user writes new message)
  useEffect(() => {
    async function getPastMessages() {
      let c = new ethers.Contract(INFINITE_CHALKBOARD_ADDRESS, abi, provider)
      let writes = await c.queryFilter('Write');
      setPastMessages(writes.map(x=>({blockNumber: x.blockNumber, message: x.args[0], author: x.args[1], cost: x.args[2]})));
    }
    if (provider) {
      getPastMessages();
    }
  }, [provider, message]);

  // Return the JSX
  if (wrongChain) {
    return (
      <div>
        <h1 style={{textAlign: "center"}}>The Infinite Chalkboard</h1>
        <h3 style={{textAlign: "center"}}>Wrong Chain! Please switch to {NETWORK.name}.</h3>
      </div>
    )
  }
  if (metamaskInstalled) {
    return (
      <Container>
        {/* The header and rules */}
        <div align="right">
          {address
            ? <StyledButton>{NETWORK.name + ": " + address.slice(0, 6) + "..." + address.slice(38)}</StyledButton>
            : <StyledButton onClick={connectMetamask}>Connect</StyledButton>}
        </div>
        <BorderedDiv style={{position: "relative"}}>
          <ul>
            <span><h1 style={{margin: "0"}}>The Infinite Chalkboard</h1></span>
            <li>There can only be one message on the chalkboard.</li>
            <li>It costs <b>0.1 * 1.1 ^ (# of prior messages) {NETWORK.currency}</b> to write a message, overwriting the existing one.</li>
            <li>After a new message, the prior author receives 109% of what they originally paid. The remaining 1% remains in this contract.
              <i>This means if someone writes after you, you'll get your money back (+ 9% more!)</i></li>
          </ul>
          <div style={{position: "absolute", top: "20px", right: "50px"}}>
            <div>Contract: <a href={NETWORK.block_explorer_url + "address/" + INFINITE_CHALKBOARD_ADDRESS} target="_blank">
              { INFINITE_CHALKBOARD_ADDRESS.slice(0, 6) + "..." + INFINITE_CHALKBOARD_ADDRESS.slice(38) }
            </a></div>
            <div>Made by: <a href="https://twitter.com/AzFlin" target="_blank">@AzFlin</a></div>
          </div>
        </BorderedDiv>
        {/* The chalkboard */}
        <div style={{display: "flex", justifyContent: "center"}}>
          <div style={{position: "relative"}}>
            <img src={chalkboard} width="800px" height="auto" alt="chalkboard"></img>
            <div style={{position: "absolute", height: "50%", width: "75%", overflow: "auto", margin: "auto", top: 0, left: 0, bottom: 0, right: 0, fontSize: "26px"}}>
              {message}
            </div>
            <div style={{position: "absolute", top: "420px", right: "60px"}}>
               - {author}
            </div>
          </div>
        </div>
        {/* Write message form */}
        <BorderedDiv style={{padding: "15px", margin: "15px 0", display: "flex"}}>
          <div>
            <h3>Write message (max 200 bytes):</h3>
            <div>
              <p style={{fontSize: "20px"}}>Cost: {parseFloat(cost).toFixed(6)} {NETWORK.currency}</p>
            </div>
          </div>
          <div style={{display: "flex", alignItems: "center"}}>
            <MessageForm writeMessage={writeMessage}></MessageForm>
          </div>
        </BorderedDiv>
        {/* Past Messages */}
        <PastMessages>
          <h1>Past Messages</h1>
          <div style={{display: "flex", flexDirection: "column-reverse", maxHeight: "300px", overflow: "scroll"}}>
            {pastMessages && pastMessages.map((message => 
              <div key={message.blockNumber} style={{marginBottom: "10px"}}>
                <div>
                  <u>Block #: {message.blockNumber}, {message.author.slice(0, 6)}...{message.author.slice(38)} wrote (costing {(parseFloat(ethers.utils.formatEther(message.cost))/1.1).toFixed(6)} {NETWORK.currency}):</u>
                </div>
                <div>&nbsp;&nbsp;{message.message}</div>
              </div>
            ))}
          </div>
        </PastMessages>
        {/* Processing transaction box */}
        {processingTransaction &&
          <Status type="processing" url={NETWORK.block_explorer_url + "tx/" + txHash} txHash={txHash} messageJSX={<div>Processing Transaction<Dots></Dots></div>}></Status>
        }
        {/* RPC Error transaction box */}
        {errorTransaction &&
          <Status messageJSX={<div>{errorTransaction}</div>} closeable={true} setErrorTransaction={setErrorTransaction}></Status>
        }
      </Container>
    );
  } else {
    return (
      <div>
        <h1 style={{textAlign: "center"}}>The Infinite Chalkboard</h1>
        <h3 style={{textAlign: "center"}}>Please install Metamask.</h3>
      </div>
    );
  }

}

export default App;