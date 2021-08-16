import { Container, Col, Row, Button } from 'react-bootstrap';
import './App.css';
import detectEthereumProvider from '@metamask/detect-provider';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { abi } from "./abis/InfiniteChalkboard.json";
import MessageForm from './components/MessageForm';

const INFINITE_CHALKBOARD_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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

  // Form input, messageToWrite
  const [messageToWrite, setMessageToWrite] = useState("");

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
    let txReceipt = await txResponse.wait();
    if (txReceipt.status === 1) {
      setMessage(txReceipt.events[0].args[0]);
      setAuthor(txReceipt.events[0].args[1]);
      setCost(ethers.utils.formatEther(txReceipt.events[0].args[2]));
    } else {
      console.log("Transaction reverted.");
    }
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
    <Container className="mt-2">
      <div align="right">
        {address ? address : <Button onClick={connectMetamask}>Connect</Button>}
      </div>
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