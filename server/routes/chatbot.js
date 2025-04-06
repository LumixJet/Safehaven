const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// This file would be part of your Node.js backend

router.post('/ask', async (req, res) => {
  try {
    const { userInput } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    // Check if API key exists
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is missing');
    }
    
    // Define the prompt with SafeHaven context
    const prompt = `You are a helpful assistant for SafeHaven, a personal safety and emergency response app.
    Provide concise, helpful information about the app's features:
    - SOS alerts to emergency contacts
    - Live location sharing with trusted contacts
    - Community safety map showing safe/unsafe areas
    - Check-in features for journey monitoring
    - Discreet mode for emergencies
    
    The user's question is: ${userInput}
    
    Keep responses under 3 sentences when possible and focus specifically on SafeHaven's features.`;
    
    // Call Gemini API
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        }
      }
    );
    
    // Extract the response text
    const botResponse = response.data.candidates[0].content.parts[0].text;
    
    res.json({ response: botResponse });
  } catch (error) {
    console.error('Error processing chatbot request:', error);
    res.status(500).json({ error: 'Failed to get response', details: error.message });
  }
});

module.exports = router;