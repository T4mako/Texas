/**
 * local server entry file, for local development
 */
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { setupSocket } from './socket/index.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for dev/intranet
    methods: ["GET", "POST"]
  }
});

setupSocket(io);

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Remove default export as we are running the server here
// export default app; 
// But if app.ts is used by Vercel, we should keep app.ts separate. 
// server.ts is for local dev or custom server deployment.
