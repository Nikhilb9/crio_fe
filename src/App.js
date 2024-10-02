import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const socketRef = useRef(null);
  const [broadcastMessage, setBroadcastMessage] = useState(''); // State for the broadcast message
  const [receivedMessages, setReceivedMessages] = useState([]); // Store messages automatically received from server

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:9000/auth/login', {
        email: email,
        password: password,
      });
      const { role, token } = response.data;
      setRole(role);
      setToken(token);
      setLoggedIn(true);

      // Connect to WebSocket once logged in
      socketRef.current = io('ws://localhost:9000', {
        transports: ['websocket'],
        cors: { origin: '*' },
      });

      // Handle connection
      socketRef.current.on('connect', () => {
        // Emit userConnected event after connection
        socketRef.current.emit('userConnected', {
          username: email, // User identifier
        });
      });

      // Listen for active users
      socketRef.current.on('activeUsers', (users) => {
        console.log(
          '==**************************************',
          users,
          new Set(users)
        );
        setActiveUsers(users);
      });

      // Automatically receive messages from server
      socketRef.current.on('broadcast', (message) => {
        setReceivedMessages((prevMessages) => [...prevMessages, message]); // Append new message to receivedMessages
      });
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  // Clean up WebSocket on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Handle broadcast message submission by admin
  const handleBroadcastSubmit = () => {
    if (broadcastMessage && socketRef.current) {
      socketRef.current.emit('broadcastMessage', broadcastMessage); // Emit the message to the WebSocket server
      setBroadcastMessage(''); // Clear the input after sending the message
    }
  };

  return (
    <div>
      {!loggedIn ? (
        <div>
          <h2>Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <br />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />
          <button onClick={handleLogin}>Login</button>
        </div>
      ) : (
        <div>
          {role === 'ADMIN' ? (
            <div>
              <h3>Welcome Admin!</h3>
              <h4>Active Users:</h4>
              <ul>
                {activeUsers.map((user) => (
                  <li>{user}</li>
                ))}
              </ul>
              {/* Broadcast message input and submit button */}
              <input
                type="text"
                placeholder="Enter message to broadcast"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
              />
              <button onClick={handleBroadcastSubmit}>Send Broadcast</button>
            </div>
          ) : (
            <div>
              <h3>Welcome User!</h3>
              <p>Message : {receivedMessages}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Login;
