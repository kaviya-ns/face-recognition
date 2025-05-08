import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './home.css';
const Register = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [name, setName] = useState('');
  const [imageData, setImageData] = useState(null);

  // Start webcam on mount
  useEffect(() => {
    const video = videoRef.current; // Store the current value in a variable
    
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (video) {
          video.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing webcam: ", err);
      });

    return () => {
      // Use the variable we stored earlier
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array means this runs once on mount/unmount

  const captureFace = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    setImageData(dataUrl);
  };

  const handleSubmit = async () => {
    if (!name || !imageData) {
      alert('Please enter a name and capture a face first.');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/register', {
        name,
        image: imageData,
      });
      alert('User registered successfully!');
      setName('');
      setImageData(null);
    } catch (error) {
      console.error('Error registering user:', error.response?.data || error.message);
      alert('Registration failed: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Register Face</h2>
      <div>
        <video ref={videoRef} autoPlay playsInline className="w-80 rounded" />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <input
        type="text"
        placeholder="Enter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 mt-4 w-full max-w-sm"
      />

      <div className="flex gap-4 mt-4">
        <button onClick={captureFace} className="bg-blue-500 text-white px-4 py-2 rounded">
          Capture
        </button>
        <button onClick={handleSubmit} className="bg-green-500 text-white px-4 py-2 rounded">
          Submit
        </button>
      </div>

      {imageData && (
        <div className="mt-4">
          <p>Preview:</p>
          <img src={imageData} alt="Captured face" className="w-40 border rounded" />
        </div>
      )}
    </div>
  );
};

export default Register;