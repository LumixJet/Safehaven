// server/routes/safetyRoutes.js
const express = require('express');
const router = express.Router();
const SafetyController = require('../controllers/SafetyController');

// Get safe routes from current location
router.get('/routes', SafetyController.getSafeRoutes.bind(SafetyController));

// Get reports near a location
router.get('/reports', SafetyController.getReports.bind(SafetyController));

// Submit a new safety report
router.post('/report', SafetyController.submitReport.bind(SafetyController));

// Get ML model status
router.get('/model-status', SafetyController.getModelStatus.bind(SafetyController));

module.exports = router;