// server/chat-server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// In-memory store for demo purposes
let chatHistory = [];

io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Send chat history to new client
  socket.emit('chat_history', chatHistory);

  socket.on('chat_message', async (msg) => {
    try {
      // Add user message to history
      const userMessage = {
        text: msg.text,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      chatHistory.push(userMessage);
      io.emit('chat_message', userMessage);

      // Get response from Flask RAG system
      const response = await axios.post('http://localhost:5000/api/query', {
        question: msg.text
      });

      // Add bot response to history
      const botResponse = {
        text: response.data.answer,
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      chatHistory.push(botResponse);
      io.emit('chat_message', botResponse);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        text: "Sorry, I couldn't process your request",
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      chatHistory.push(errorMessage);
      io.emit('chat_message', errorMessage);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});