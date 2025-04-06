const mongoose = require('mongoose');

const SOSEventSchema = new mongoose.Schema({
  userId: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  contactsSent: { type: Number, required: true },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
});

module.exports = mongoose.model('SOSEvent', SOSEventSchema);