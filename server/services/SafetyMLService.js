const tf = require('@tensorflow/tfjs'); // TensorFlow.js for machine learning
const SafetyReport = require('../models/SafetyReport'); // Mongoose model for safety reports
const fs = require('fs').promises; // Async file system operations
const path = require('path'); // Path utilities

// Helper function to calculate distance between two lat/lng points in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180); // Convert latitude difference to radians
  const dLon = (lon2 - lon1) * (Math.PI / 180); // Convert longitude difference to radians
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); // Haversine formula part 1
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Haversine formula part 2
  return R * c; // Distance in kilometers
};

// SafetyMLService class for managing ML-based safety predictions
class SafetyMLService {
  constructor() {
    this.model = null; // TensorFlow.js model instance
    this.isTraining = false; // Training status flag
    this.lastTrainedAt = null; // Last training timestamp
    this.trainingQueue = []; // Queue for training tasks
    this.predictionCache = new Map(); // Cache for predictions
    this.cacheTTL = 5 * 60 * 1000; // Cache timeout (5 minutes)
    this.modelLoss = null; // Loss value after training
    this.predictedHotspots = []; // Array of predicted hotspots
    this.lastSampleSize = 0; // Number of reports used in last training
    this.initModel(); // Initialize model on instantiation
  }

  // Initialize model by loading from disk or creating a new one
  async initModel() {
    try {
      const modelDir = path.join(__dirname, '../models/safety-model'); // Model storage directory
      const modelPath = `file://${path.join(modelDir, 'model.json')}`; // Path to model file

      await fs.mkdir(modelDir, { recursive: true }); // Create directory if it doesn't exist

      try {
        const modelExists = await fs.access(modelPath.slice(7)).then(() => true).catch(() => false);
        if (modelExists) {
          this.model = await tf.loadLayersModel(modelPath); // Load existing model
          console.log('Loaded existing safety model from:', modelPath);
          const metadataPath = path.join(modelDir, 'metadata.json');
          const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false);
          if (metadataExists) {
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8')); // Load metadata
            this.modelLoss = metadata.loss;
            this.lastTrainedAt = metadata.lastTrainedAt ? new Date(metadata.lastTrainedAt) : null;
            this.lastSampleSize = metadata.sampleSize || 0;
            console.log(`Loaded model metadata - Loss: ${this.modelLoss}`);
          }
        } else {
          console.log('No existing model found at:', modelPath);
          this.model = this.createModel(); // Create new model
          this.scheduleTraining(); // Schedule initial training
        }
      } catch (loadError) {
        console.error('Model loading error:', loadError);
        this.model = this.createModel();
        this.scheduleTraining();
      }
    } catch (error) {
      console.error('Model initialization error:', error);
      this.model = this.createModel();
      this.scheduleTraining();
    }
  }

  // Create a new neural network model
  createModel() {
    const model = tf.sequential(); // Sequential model (stack of layers)
    model.add(tf.layers.dense({
      units: 32, // 32 neurons
      activation: 'relu', // Rectified Linear Unit activation
      inputShape: [8], // 8 input features (lat, lng, time, etc.)
    }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' })); // Hidden layer with 16 neurons
    model.add(tf.layers.dropout({ rate: 0.2 })); // Dropout 20% to prevent overfitting
    model.add(tf.layers.dense({ units: 8, activation: 'relu' })); // Hidden layer with 8 neurons
    model.add(tf.layers.dense({ units: 1 })); // Output layer (safety score)

    model.compile({
      optimizer: tf.train.adam(0.001), // Adam optimizer with learning rate 0.001
      loss: 'meanSquaredError', // Loss function for regression
      metrics: ['mse'], // Mean squared error metric
    });

    return model;
  }

  // Save the trained model to disk
  async saveModel() {
    try {
      const modelDir = path.join(__dirname, '../models/safety-model');
      await fs.mkdir(modelDir, { recursive: true });

      await this.model.save(`file://${modelDir}`); // Save model files

      if (this.modelLoss !== null) {
        const metadata = {
          loss: this.modelLoss,
          lastTrainedAt: this.lastTrainedAt,
          sampleSize: this.lastSampleSize
        };
        await fs.writeFile(
          path.join(modelDir, 'metadata.json'),
          JSON.stringify(metadata, null, 2) // Pretty-print JSON
        );
      }

      const files = await fs.readdir(modelDir);
      console.log('Model saved successfully. Directory contents:', files);
    } catch (saveError) {
      console.error('Detailed model save error:', {
        message: saveError.message,
        stack: saveError.stack
      });
      throw saveError;
    }
  }

  // Process training tasks in the queue
  async processTrainingQueue() {
    if (this.isTraining || this.trainingQueue.length === 0) return; // Skip if training or queue empty

    this.isTraining = true;
    this.trainingQueue = [];

    try {
      await this.trainModel(); // Train the model
      try {
        await this.saveModel(); // Save after training
      } catch (saveError) {
        console.error('Save failed, continuing with hotspots:', saveError);
      }
      await this.identifyHotspots(); // Identify hotspots
    } catch (error) {
      console.error('Training or hotspot error:', error);
    } finally {
      this.isTraining = false;
      if (this.trainingQueue.length > 0) {
        setTimeout(() => this.processTrainingQueue(), 1000); // Process next task after 1s
      }
    }
  }

  // Train the model with safety report data
  async trainModel() {
    try {
      const reports = await SafetyReport.find().sort({ timestamp: -1 }).limit(10000); // Get latest 10k reports
      if (reports.length < 10) {
        console.log('Not enough data for training, using default model');
        return;
      }

      this.lastSampleSize = reports.length;
      const now = new Date();
      const trainingData = reports.map((r) => {
        const reportTime = new Date(r.timestamp);
        const hourOfDay = reportTime.getHours();
        const dayOfWeek = reportTime.getDay();
        const daysSinceReport = (now - reportTime) / (1000 * 60 * 60 * 24);

        const nearbyReports = reports.filter((nr) => {
          return calculateDistance(
            r.location.coordinates[1],
            r.location.coordinates[0],
            nr.location.coordinates[1],
            nr.location.coordinates[0]
          ) <= 0.5; // 0.5km radius for nearby reports
        });

        const incidentCount = Math.min(10, nearbyReports.length);
        const avgSeverity = nearbyReports.reduce((sum, nr) => sum + nr.severity, 0) / Math.max(1, nearbyReports.length);
        const unsafeCount = nearbyReports.filter((nr) =>
          ['unsafe', 'incident', 'suspicious'].includes(nr.type)
        ).length;
        const unsafeRatio = unsafeCount / Math.max(1, nearbyReports.length);

        let safetyScore = 0.5;
        if (['unsafe', 'incident'].includes(r.type)) {
          safetyScore = Math.max(0.1, 0.5 - r.severity / 10 - unsafeRatio / 5);
        } else if (r.type === 'safe') {
          safetyScore = Math.min(0.9, 0.5 + r.severity / 10 - unsafeRatio / 5);
        } else if (r.type === 'suspicious') {
          safetyScore = Math.max(0.2, 0.5 - r.severity / 20 - unsafeRatio / 10);
        }

        const recencyFactor = Math.max(0.5, 1 - daysSinceReport / 30);
        safetyScore = safetyScore * recencyFactor;

        if (hourOfDay >= 22 || hourOfDay <= 5) {
          safetyScore = Math.max(0.1, safetyScore - 0.1);
        }

        return {
          features: [
            r.location.coordinates[1] / 90, // Normalized latitude
            r.location.coordinates[0] / 180, // Normalized longitude
            hourOfDay / 24, // Normalized hour
            dayOfWeek / 7, // Normalized day
            incidentCount / 10, // Normalized incident count
            avgSeverity / 5, // Normalized severity
            Math.min(1, daysSinceReport / 30), // Normalized recency
            unsafeRatio, // Unsafe ratio
          ],
          label: safetyScore, // Target safety score
        };
      });

      const shuffled = this.shuffleArray(trainingData); // Shuffle data for better training
      const xs = tf.tensor2d(shuffled.map((d) => d.features)); // Input tensor
      const ys = tf.tensor2d(shuffled.map((d) => [d.label])); // Output tensor

      console.log('Starting model training with', shuffled.length, 'samples');
      const history = await this.model.fit(xs, ys, {
        epochs: 30, // Number of training iterations
        batchSize: 32, // Batch size for training
        validationSplit: 0.2, // 20% for validation
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, mse = ${logs.mse.toFixed(4)}`);
          },
        },
      });

      xs.dispose(); // Free memory
      ys.dispose();

      this.lastTrainedAt = new Date();
      this.modelLoss = history.history.loss[history.history.loss.length - 1];
      console.log(`Model training completed - Loss: ${this.modelLoss.toFixed(4)}`);
    } catch (error) {
      console.error('Error training model:', error);
    }
  }

  // Schedule a training task
  scheduleTraining() {
    if (this.isTraining) return;
    this.trainingQueue.push(Date.now());
    this.processTrainingQueue();
    this.predictionCache.clear(); // Clear cache on new training
  }

  // Predict safety score and confidence for a location
  async predictSafety(lat, lng) {
    if (!this.model) {
      console.warn('Model is not initialized, using heuristic');
      const heuristicScore = this.getHeuristicSafety(lat, lng);
      const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      this.predictionCache.set(cacheKey, { 
        score: heuristicScore, 
        confidence: 0.5, 
        timestamp: Date.now() 
      });
      return { score: heuristicScore, confidence: 0.5 };
    }

    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cachedPrediction = this.predictionCache.get(cacheKey);
    if (cachedPrediction && cachedPrediction.timestamp > Date.now() - this.cacheTTL) {
      return { score: cachedPrediction.score, confidence: cachedPrediction.confidence };
    }

    try {
      const nearbyReports = await SafetyReport.findNearby(lat, lng, 0.5); // 0.5km radius for prediction features
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      let safetyScore;
      let confidence;

      if (nearbyReports.length === 0) {
        safetyScore = this.getHeuristicSafety(lat, lng);
        confidence = 0.5; // Moderate confidence for heuristic
      } else {
        const avgSeverity = nearbyReports.reduce((sum, r) => sum + r.severity, 0) / nearbyReports.length;
        const avgDaysSince = nearbyReports.reduce((sum, r) => {
          const reportTime = new Date(r.timestamp);
          return sum + (now - reportTime) / (1000 * 60 * 60 * 24);
        }, 0) / nearbyReports.length;

        const unsafeCount = nearbyReports.filter((r) =>
          ['unsafe', 'incident', 'suspicious'].includes(r.type)
        ).length;
        const unsafeRatio = unsafeCount / nearbyReports.length;

        const input = tf.tensor2d([[
          lat / 90,
          lng / 180,
          hour / 24,
          dayOfWeek / 7,
          Math.min(1, nearbyReports.length / 10),
          avgSeverity / 5,
          Math.min(1, avgDaysSince / 30),
          unsafeRatio,
        ]]);

        const prediction = this.model.predict(input);
        safetyScore = prediction.dataSync()[0];

        if (hour >= 22 || hour <= 5) {
          safetyScore = Math.max(0.1, safetyScore - 0.1);
        }

        const recentReports = nearbyReports.filter((r) => {
          const reportTime = new Date(r.timestamp);
          return now - reportTime < 24 * 60 * 60 * 1000;
        });

        if (recentReports.length > 0) {
          const recentUnsafeCount = recentReports.filter((r) =>
            ['unsafe', 'incident'].includes(r.type)
          ).length;
          if (recentUnsafeCount > 0) {
            safetyScore = Math.max(0.1, safetyScore - 0.05 * recentUnsafeCount);
          }
        }

        safetyScore = Math.max(0.1, Math.min(0.9, safetyScore));

        // Calculate confidence based on report count and recency
        const reportCountFactor = Math.min(1, nearbyReports.length / 10); // 0-1, capped at 10
        const recencyFactor = Math.max(0.5, 1 - avgDaysSince / 30); // 0.5-1, recent = higher
        confidence = reportCountFactor * 0.7 + recencyFactor * 0.3; // Weighted average

        input.dispose();
        prediction.dispose();
      }

      this.predictionCache.set(cacheKey, { 
        score: safetyScore, 
        confidence, 
        timestamp: Date.now() 
      });
      return { score: safetyScore, confidence };
    } catch (error) {
      console.error('Prediction error:', error);
      const heuristicScore = this.getHeuristicSafety(lat, lng);
      this.predictionCache.set(cacheKey, { 
        score: heuristicScore, 
        confidence: 0.5, 
        timestamp: Date.now() 
      });
      return { score: heuristicScore, confidence: 0.5 };
    }
  }

  // Heuristic safety score when model isn't available
  getHeuristicSafety(lat, lng) {
    const now = new Date();
    const hour = now.getHours();
    let baseScore = 0.7;
    if (hour >= 22 || hour <= 5) baseScore = 0.5;
    else if (hour >= 18 && hour < 22) baseScore = 0.6;
    else if (hour > 5 && hour < 8) baseScore = 0.65;

    const latFactor = Math.sin(lat * 10) * 0.1;
    const lngFactor = Math.cos(lng * 10) * 0.1;
    const locationFactor = latFactor + lngFactor;
    const randomFactor = Math.random() * 0.1 - 0.05;

    return Math.max(0.1, Math.min(0.9, baseScore + locationFactor + randomFactor));
  }

  // Identify hotspots within 2km radius using true circular distance
  async identifyHotspots() {
    try {
      const reports = await SafetyReport.find().sort({ timestamp: -1 }).limit(500); // Latest 500 reports
      if (reports.length < 20 || !this.model) {
        console.log('Not enough data or model not ready for hotspot identification');
        return;
      }

      const predictions = [];
      const processedLocations = new Set();

      for (const report of reports) {
        const lat = report.location.coordinates[1];
        const lng = report.location.coordinates[0];
        const locationKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

        if (processedLocations.has(locationKey)) continue; // Skip duplicates
        processedLocations.add(locationKey);

        // Find reports within 2km using true distance
        const nearbyReports = reports.filter(r => {
          const rLat = r.location.coordinates[1];
          const rLng = r.location.coordinates[0];
          const distance = calculateDistance(lat, lng, rLat, rLng);
          return distance <= 2; // 2km radius
        });

        if (nearbyReports.length >= 3) { // Require at least 3 reports
          const { score, confidence } = await this.predictSafety(lat, lng);
          predictions.push({
            location: { lat, lng },
            safetyScore: score,
            confidence,
            category: score > 0.7 ? 'safe' : score < 0.4 ? 'unsafe' : 'moderate',
            reportCount: nearbyReports.length
          });
        }
      }

      // Sort and select top hotspots
      const sortedByScore = [...predictions].sort((a, b) => b.safetyScore - a.safetyScore);
      const safestLocations = sortedByScore.slice(0, 5); // Top 5 safest
      const unsafestLocations = sortedByScore.slice(-5).reverse(); // Top 5 unsafest
      const sortedByActivity = [...predictions].sort((a, b) => b.reportCount - a.reportCount);
      const mostActiveLocations = sortedByActivity.slice(0, 5); // Top 5 active

      const allHotspots = [...safestLocations, ...unsafestLocations, ...mostActiveLocations];
      const uniqueHotspots = [];
      const seenKeys = new Set();

      // Remove duplicates
      for (const hotspot of allHotspots) {
        const key = `${hotspot.location.lat.toFixed(5)},${hotspot.location.lng.toFixed(5)}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueHotspots.push(hotspot);
        }
      }

      this.predictedHotspots = uniqueHotspots;
      console.log(`Identified ${this.predictedHotspots.length} safety hotspots within 2km radius`);
    } catch (error) {
      console.error('Error identifying hotspots:', error);
    }
  }

  // Get nearby hotspots within a specified radius
  async getNearbyHotspots(lat, lng, radiusKm = 2) {
    if (this.predictedHotspots.length === 0) {
      await this.identifyHotspots(); // Generate hotspots if none exist
    }

    const nearbyHotspots = this.predictedHotspots.filter(hotspot => {
      const hLat = hotspot.location.lat;
      const hLng = hotspot.location.lng;
      const distance = calculateDistance(lat, lng, hLat, hLng);
      return distance <= radiusKm; // True circular radius
    });

    return {
      hotspots: nearbyHotspots,
      totalCount: nearbyHotspots.length,
      safeCount: nearbyHotspots.filter(h => h.category === 'safe').length,
      unsafeCount: nearbyHotspots.filter(h => h.category === 'unsafe').length,
      moderateCount: nearbyHotspots.filter(h => h.category === 'moderate').length
    };
  }

  // Clean up expired cache entries
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.predictionCache.entries()) {
      if (value.timestamp < now - this.cacheTTL) {
        this.predictionCache.delete(key);
      }
    }
  }

  // Shuffle array for training data randomization
  shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Get current service status
  getStatus() {
    return {
      isReady: !!this.model,
      isTraining: this.isTraining,
      lastTrainedAt: this.lastTrainedAt,
      queueLength: this.trainingQueue.length,
      cacheSize: this.predictionCache.size,
      modelLoss: this.modelLoss ? this.modelLoss.toFixed(4) : 'Not trained yet',
      modelMSE: this.modelLoss ? this.modelLoss.toFixed(4) : 'Not trained yet',
      sampleSize: this.lastSampleSize || 0,
      predictedHotspots: this.predictedHotspots.slice(0, 10), // Limit to 10 for brevity
      trainingTimestamp: this.lastTrainedAt ? this.lastTrainedAt.toISOString() : null
    };
  }
}

module.exports = new SafetyMLService(); // Export singleton instance