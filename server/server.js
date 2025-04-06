// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const sosRoutes = require('./routes/sosRoutes');
const chatbotRoutes = require('./routes/chatbot');
const safetyRoutes = require('./routes/safetyRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketService = require('./services/socketService');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const SafetyReport = mongoose.model('SafetyReport');

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize socket.io
socketService.initSocket(server);

// Ensure models directory exists for TensorFlow.js model saving
const modelsDir = path.join(__dirname, 'models', 'safety-model');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('Created models directory for safety ML model');
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => res.json({ 
  success: true, 
  message: 'Server is healthy',
  env: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGO_URI_EXISTS: !!process.env.MONGO_URI,
    TWILIO_CONFIGURED: !!(process.env.TWILIO_ACCOUNT_SID && 
                         process.env.TWILIO_AUTH_TOKEN && 
                         process.env.TWILIO_PHONE_NUMBER),
    GOOGLE_MAPS_API_KEY_EXISTS: !!process.env.GOOGLE_MAPS_API_KEY
  }
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', sosRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/safety', safetyRoutes);


// Google Maps Routes API proxy
app.post('/api/routes', async (req, res) => {
  const { origin, destination } = req.body;
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({ 
        origin, 
        destination, 
        travelMode: 'WALK',
        computeAlternativeRoutes: false,
        units: 'METRIC'
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Routes API error:', errorData);
      return res.status(response.status).json({ 
        error: true, 
        message: 'Routes API failed', 
        details: errorData 
      });
    }
    
    res.json(await response.json());
  } catch (error) {
    console.error('Error proxying routes request:', error);
    res.status(500).json({ message: error.message });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  
  // Connect to database
  connectDB().catch(err => {
    console.error('Database connection failed:', err.message);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message, err.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message, err.stack);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('Received shutdown signal, closing server and database connections');
  server.close(() => {
    console.log('Server closed');
    // Close database connection
    mongoose.connection.close(false, () => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
  
  // If server doesn't close in 10 seconds, force shutdown
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Add this code to your server.js after MongoDB connection is established
mongoose.connection.once('open', async () => {
  console.log('MongoDB Connected...');
  
  try {
    // Ensure 2dsphere index exists on the location field
    await mongoose.connection.db.collection('safetyreports').createIndex({ 'location': '2dsphere' });
    console.log('Created 2dsphere index for safety reports');
  } catch (error) {
    console.error('Error creating geospatial index:', error);
  }
});

module.exports = { server };