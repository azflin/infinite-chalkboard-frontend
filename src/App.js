import './App.css';
import detectEthereumProvider from '@metamask/detect-provider';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import styled from 'styled-components'

import { abi } from "./abis/InfiniteChalkboard.json";
import MessageForm from './components/MessageForm';
import chalkboard from './chalkboard.png'
import { StyledButton } from "./components/MessageForm"

const INFINITE_CHALKBOARD_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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
const ProcessingTransaction = styled.div`
  position: fixed;
  bottom: 50px;
  right: 20px;
  border: 2px solid white;
  border-radius: 10px;
  font-size: 24px;
  padding: 10px;
  background-color: rgba(38, 122, 59, 0.8)
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

  const [processingTransaction, setProcessingTransaction] = useState(false);
  const [metamaskInstalled, setMetamaskInstalled] = useState(false);
  const [wrongChain, setWrongChain] = useState(false);

  // Function to request metamask connection
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
    let txResponse = await contract.write(message, {value: ethers.utils.parseEther(cost)});
    setProcessingTransaction(true);
    let txReceipt = await txResponse.wait();
    if (txReceipt.status === 1) {
      setMessage(txReceipt.events[0].args[0]);
      setAuthor(txReceipt.events[0].args[1]);
      setCost(ethers.utils.formatEther(txReceipt.events[0].args[2]));
    } else {
      console.log("Transaction reverted.");
    }
    setProcessingTransaction(false);
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
        if (chainId !== 31337) {
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

  // Once we have a signer, instantiate the contract with signer. Set contract state variables.
  useEffect(() => {
    async function instantiateContract() {
      let c = new ethers.Contract(INFINITE_CHALKBOARD_ADDRESS, abi, signer)
      setContract(c);
      setMessage(await c.message());
      setCost(ethers.utils.formatEther(await c.cost()));
      setAuthor(await c.author());
    }
    if (signer) {
      instantiateContract();
    }
  }, [signer]);

  if (wrongChain) {
    return (
      <div>
        <h1 style={{textAlign: "center"}}>The Infinite Chalkboard</h1>
        <h3 style={{textAlign: "center"}}>Wrong Chain! Please switch to localhost.</h3>
      </div>
    )
  }
  if (metamaskInstalled) {
    return (
      <Container>
        {/* The header and rules */}
        <div align="right">
          {address ? address : <StyledButton onClick={connectMetamask}>Connect</StyledButton>}
        </div>
        <BorderedDiv>
          <ul>
            <span><h1 style={{margin: "0"}}>The Infinite Chalkboard</h1></span>
            <li>There can only be one message on the chalkboard.</li>
            <li>It costs <b>0.1 * 1.1 ^ (# of prior messages) ETH</b> to write a message, overwriting the existing one.</li>
            <li>After a new message, the prior author receives 109% of what they originally paid. The remaining 1% remains in this contract.</li>
          </ul>
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
              <p style={{fontSize: "20px"}}>Cost: {parseFloat(cost).toFixed(6)} ETH</p>
            </div>
          </div>
          <div style={{display: "flex", alignItems: "center"}}>
            <MessageForm writeMessage={writeMessage}></MessageForm>
          </div>
        </BorderedDiv>
        {/* Processing transaction box */}
        {processingTransaction &&
          <ProcessingTransaction>
            Processing Transaction<Dots></Dots>
          </ProcessingTransaction>
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