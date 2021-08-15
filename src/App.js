import { Container, Col, Row, Button } from 'react-bootstrap';
import './App.css';
import detectEthereumProvider from '@metamask/detect-provider';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

function App() {

  const [provider, setProvider] = useState();
  const [signer, setSigner] = useState();
  const [address, setAddress] = useState();

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

  const logStuff = () => {
    console.log(signer);
  }

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

  return (
    <Container className="mt-2">
      <div align="right">
        {address ? address : <Button onClick={connectMetamask}>Connect</Button>}
      </div>
      <Button onClick={logStuff}>Log Stuff</Button>
    </Container>
  );
}

export default App;