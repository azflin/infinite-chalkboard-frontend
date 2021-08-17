import './App.css';
import detectEthereumProvider from '@metamask/detect-provider';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import styled from 'styled-components'

import { abi } from "./abis/InfiniteChalkboard.json";
import MessageForm from './components/MessageForm';

const INFINITE_CHALKBOARD_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const Container = styled.div`
  max-width: 900px;
  margin: auto;
`
const Rules = styled.div`
  border: 2px solid white;
  border-radius: 20px;
  background-color: rgba(138, 192, 138, 0.5);
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
      let p = new ethers.providers.Web3Provider(window.ethereum);
      let accounts = await p.listAccounts();
      if (accounts.length) {
        setAddress(accounts[0]);
        setSigner(p.getSigner());
      }
      setProvider(p);
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

  return (
    <Container>
      { processingTransaction && <h3>Processing transaction ...</h3>}
      <div align="right">
        {address ? address : <button onClick={connectMetamask}>Connect</button>}
      </div>
      <Rules>
        <ul>
          <span><h3 style={{margin: "0"}}>Classroom Rules</h3></span>
          <li>There can only be one message on the chalkboard.</li>
          <li>It costs <b>0.1 * 1.1 ^ (# of prior messages) ETH</b> to write a message, overwriting the existing one.</li>
          <li>After a new message, the prior author receives 109% of what they originally paid. The remaining 1% remains in this contract.</li>
        </ul>
      </Rules>
      <h1 style={{textAlign: "center"}}>THE INFINITE CHALKBOARD</h1>
      <div>
        <div>Message: {message}</div>
        <div>Author: {author}</div>
        <div>Cost: {cost}</div>
        <MessageForm writeMessage={writeMessage}></MessageForm>
      </div>
    </Container>
  );
}

export default App;