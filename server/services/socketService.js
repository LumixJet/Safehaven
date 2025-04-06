// server->services->socketService.js
const socketIO = require('socket.io');

let io;

// Initialize socket.io server
function initSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL 
        : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send a welcome message
    socket.emit('welcome', { message: 'Connected to safety server' });

    // Set up ping-pong to keep connection alive
    const pingInterval = setInterval(() => {
      socket.emit('ping');
    }, 25000);

    socket.on('pong', () => {
      // Client responded to ping
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected (${socket.id}): ${reason}`);
      clearInterval(pingInterval);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
}

// Get the io instance
function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

module.exports = { initSocket, getIO };
