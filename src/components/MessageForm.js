import React from 'react';
import { useState } from 'react';
import styled from 'styled-components'

const Submit = styled.input`
  display: inline-block;
  background: #000;
  color: #fff;
  border: none;
  padding: 10px 20px;
  margin: 10px;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  font-size: 15px;
  font-family: inherit;
`

export default function MessageForm({ writeMessage }) {
  const [message, setMessage] = useState("");
  const handleSubmit= (e) => {
    e.preventDefault();
    writeMessage(message);
  }

  return (
    <form onSubmit={e => { handleSubmit(e) }} style={{marginLeft: "20px"}}>
      <div style={{display: "flex", alignItems: "center"}}>
        <textarea 
          name='message' 
          type='text'
          value={message}
          onChange={e => setMessage(e.target.value)}
          style={{width: "300px"}}
        />
        <Submit 
          type='submit'
          value='Submit'
        />
      </div>
    </form>
  )
}