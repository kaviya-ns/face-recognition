import React from 'react';
import './home.css';

export default function LiveRecognition() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Live Face Recognition</h2>
        <p>Real-time face detection from your camera feed</p>
      </div>
      
      <div className="recognition-container">
        <img
          src="http://localhost:5000/video_feed"
          alt="Live Face Recognition Stream"
          className="video-feed"
        />
      </div>
    </div>
  );
}