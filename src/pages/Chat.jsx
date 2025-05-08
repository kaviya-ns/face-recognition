// Chat.jsx
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to Node.js Socket.IO server
    const newSocket = io('http://localhost:3001');
    
    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('chat_history', (history) => {
      setMessages(history);
    });

    newSocket.on('chat_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (socket && message.trim()) {
      socket.emit('chat_message', { text: message });
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Face Recognition Chat</h2>
      <div style={{ 
        height: '300px', 
        border: '1px solid #ccc', 
        overflowY: 'scroll', 
        marginBottom: '10px',
        padding: '10px'
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            textAlign: msg.sender === 'user' ? 'right' : 'left',
            margin: '5px 0'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '8px 12px',
              borderRadius: '15px',
              backgroundColor: msg.sender === 'user' ? '#007bff' : '#e9ecef',
              color: msg.sender === 'user' ? 'white' : 'black'
            }}>
              {msg.text}
              <div style={{ fontSize: '0.8em', color: '#666' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '8px', marginRight: '8px' }}
        />
        <button 
          onClick={sendMessage}
          disabled={!isConnected}
          style={{ padding: '8px 16px' }}
        >
          Send
        </button>
      </div>
      <div style={{ marginTop: '10px', color: isConnected ? 'green' : 'red' }}>
        {isConnected ? 'Connected to chat server' : 'Disconnected'}
      </div>
    </div>
  );
};

export default Chat;