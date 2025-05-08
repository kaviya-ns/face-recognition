import React from 'react';
import './App.css';
import Home from './pages/home';
import Register from './pages/Register';
import Recognize from './pages/Recognize';
import Chat from './pages/Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recognize" element={<Recognize />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </Router>
  );
}
export default App;