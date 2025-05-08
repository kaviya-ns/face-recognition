import React from 'react';
import { Link } from 'react-router-dom';
import './home.css';
function Home() {
  return (
    <div className="home-container">
      <header className="hero-section">
        <h1>Face Recognition Platform</h1>
        <p className="subtitle">
          A real-time facial recognition system with AI-powered Q&A capabilities
        </p>
      </header>

      <div className="features-container">
        <div className="feature-card">
          <div className="feature-icon">👤</div>
          <h2>Face Registration</h2>
          <p>Register new faces by capturing images through your webcam and storing facial encodings.</p>
          <Link to="/register" className="action-button">
            Start Registration
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <h2>Live Recognition</h2>
          <p>Real-time face detection and recognition from your camera feed with name overlays.</p>
          <Link to="/recognize" className="action-button">
            Try Live Recognition
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h2>AI Assistant</h2>
          <p>Ask questions about registered faces using our Retrieval-Augmented Generation AI.</p>
          <Link to="/chat" className="action-button">
            Chat with AI
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;