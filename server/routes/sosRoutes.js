const express = require('express');
const router = express.Router();
const twilio = require('twilio');

// Define the SOS Event model directly if there are path issues
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
const SOSEvent = mongoose.models.SOSEvent || mongoose.model('SOSEvent', SOSEventSchema);

// POST /api/send-sos
router.post('/send-sos', async (req, res) => {
  try {
    const { contacts, message, location } = req.body;

    if (!contacts || !contacts.length || !message || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contacts, message, or location',
      });
    }

    console.log('Received SOS request:', {
      contactsCount: contacts.length,
      location: `${location.latitude},${location.longitude}`,
    });

    // Validate Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio credentials');
      return res.status(500).json({
        success: false,
        message: 'Server configuration issue: Twilio credentials not properly set up'
      });
    }

    // Create Twilio client
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Send SMS to all contacts
    const results = await Promise.allSettled(
      contacts.map(phoneNumber =>
        twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        })
      )
    );

    // Process results
    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push({
          phone: contacts[index],
          sid: result.value.sid,
        });
      } else {
        console.error(`Failed to send to ${contacts[index]}:`, result.reason);
        failed.push({
          phone: contacts[index],
          error: result.reason.message || 'Unknown error',
        });
      }
    });

    try {
      // Log SOS event to database - wrapped in try/catch to continue even if db fails
      await SOSEvent.create({
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        contactsSent: successful.length,
        status: failed.length === 0 ? 'sent' : 'failed',
      });
      console.log('SOS event logged to database');
    } catch (dbError) {
      console.error('Failed to log SOS event to database:', dbError);
      // Continue with the response even if DB logging fails
    }

    // Return response
    return res.status(200).json({
      success: true,
      message: `SOS alert sent to ${successful.length} contacts${failed.length > 0 ? `, failed for ${failed.length}` : ''}`,
      successful,
      failed: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('SOS route error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to send SOS: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;