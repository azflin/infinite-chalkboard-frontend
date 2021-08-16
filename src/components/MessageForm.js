import React from 'react';
import { useState } from 'react';

export default function MessageForm({ writeMessage }) {
  const [message, setMessage] = useState("");
  const handleSubmit= (e) => {
    e.preventDefault();
    writeMessage(message);
  }

  return (
    <form onSubmit={e => { handleSubmit(e) }}>
      <label>Message:</label>
      <br />
      <input 
        name='message' 
        type='text'
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      <input 
        type='submit' 
        value='Write Message'
      />
    </form>
  )
}