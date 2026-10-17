import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app.js';
import connectDB from './src/db/db.js';
import { initSocketServer } from './src/services/socket.service.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app (needed for Socket.IO)
const httpServer = createServer(app);

// Initialize Socket.IO on the HTTP server
initSocketServer(httpServer);

// Connect to Database
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO ready on ws://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to database:', err);
});
