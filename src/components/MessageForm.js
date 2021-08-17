import React from 'react';
import { useState } from 'react';
import styled from 'styled-components'

const Submit = styled.button`
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
  &:hover {
    background: rgba(0, 0, 0, 0.5);
  }
`

export default function MessageForm({ writeMessage }) {
  const [message, setMessage] = useState("");
  const [invalidString, setInvalidString] = useState(false);

  const handleSubmit= (e) => {
    e.preventDefault();
    if (encodeURI(message).split(/%..|./).length - 1 >= 200) {
      setInvalidString(true);
    } else {
      setInvalidString(false);
      writeMessage(message);
    }
  }

  return (
    <form onSubmit={e => { handleSubmit(e) }} style={{marginLeft: "20px"}}>
      {invalidString && <div>String must be less than 200 bytes.</div>}
      <div style={{display: "flex", alignItems: "center"}}>
        <textarea 
          name='message' 
          type='text'
          value={message}
          onChange={e => setMessage(e.target.value)}
          style={{width: "350px", height: "80px"}}
        />
        <Submit type='submit'>Submit</Submit>
      </div>
    </form>
  )
}