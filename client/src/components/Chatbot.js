import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './Chatbot.css';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hi there! I'm your SafeHaven assistant. How can I help you today?",
      sender: 'bot' 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // This would be your Gemini API key stored in environment variables
  // In a real implementation, you should store this on the server side
  // const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
  
  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (inputValue.trim() === '') return;
    
    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user'
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Call the Gemini API
      const response = await fetchGeminiResponse(inputValue);
      
      setMessages(prevMessages => [...prevMessages, {
        id: prevMessages.length + 1,
        text: response,
        sender: 'bot'
      }]);
    } catch (error) {
      console.error("Error fetching response:", error);
      setMessages(prevMessages => [...prevMessages, {
        id: prevMessages.length + 1,
        text: "I'm having trouble connecting right now. Please try again later.",
        sender: 'bot'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Function to fetch response from Google's Gemini API
  const fetchGeminiResponse = async (userInput) => {
    try {
      const response = await axios.post('/api/chatbot/ask', { userInput });
      return response.data.response;
    } catch (error) {
      console.error('Error fetching response:', error);
      // Return fallback response
      return getFallbackResponse(userInput);
    }
  };

  // Fallback responses when API is unavailable
  const getFallbackResponse = (userInput) => {
    const input = userInput.toLowerCase().trim();
    
    if (input.includes('emergency') || input.includes('sos') || input.includes('help')) {
      return "SafeHaven's SOS feature allows you to quickly alert your emergency contacts with your exact location. Just press the red SOS button on the home screen or tap your power button 5 times quickly. Your contacts will receive an SMS with a live tracking link and your current location.";
    } else if (input.includes('location') || input.includes('tracking') || input.includes('share')) {
      return "With SafeHaven's Live Location Sharing, you can share your real-time location with trusted contacts for a specific duration. They'll receive a secure link that expires when the sharing period ends. Great for letting someone monitor your journey home late at night.";
    } else if (input.includes('contact') || input.includes('add people') || input.includes('friend')) {
      return "You can add emergency contacts in your SafeHaven profile settings. We recommend adding at least 3 trusted contacts who will receive alerts when you trigger an SOS. You can prioritize their order and customize what information they receive.";
    } else if (input.includes('map') || input.includes('safe area') || input.includes('unsafe')) {
      return "The SafeHaven Community Safety Map uses crowdsourced data and official crime statistics to highlight safer routes and areas. Areas are color-coded from green (safe) to red (use caution). You can also see recent incident reports and add your own observations to help others.";
    } else if (input.includes('check in') || input.includes('arrival')) {
      return "SafeHaven's Check-In feature lets you set a destination and estimated arrival time. If you don't check in by that time, your emergency contacts will be automatically notified. Perfect for hiking trips or traveling to new locations.";
    } else if (input.includes('discreet') || input.includes('silent') || input.includes('hidden')) {
      return "Discreet Mode allows you to trigger an SOS without making it obvious you're using your phone. Options include shaking your phone in a specific pattern, using our widget that looks like a calculator app, or using voice commands with a safe word.";
    } else if (input.includes('setup') || input.includes('start') || input.includes('begin')) {
      return "To set up SafeHaven: 1) Download the app, 2) Create an account with your phone number for verification, 3) Add at least two emergency contacts, 4) Grant location permissions, 5) Customize your SOS message. The whole process takes about 3 minutes.";
    } else if (input.includes('privacy') || input.includes('secure') || input.includes('data')) {
      return "At SafeHaven, your privacy is our priority. Your location data is end-to-end encrypted and only shared with your explicit permission. We never sell your data to third parties, and location history is stored on your device, not our servers.";
    } else if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return "Hello! I'm your SafeHaven assistant. How can I help you stay safe today?";
    } else if (input.includes('thanks') || input.includes('thank you')) {
      return "You're welcome! Your safety is our priority. Is there anything else I can help with?";
    } else {
      return "I'm here to help with any questions about SafeHaven's safety features. You can ask about SOS alerts, location sharing, emergency contacts, the safety map, discreet mode, or check-in features. What would you like to know more about?";
    }
  };

  // Function for quick suggestion buttons
  const handleQuickSuggestion = (suggestion) => {
    setInputValue(suggestion);
    inputRef.current.focus();
  };

  return (
    <>
      {/* Chat toggle button */}
      <motion.button
        className="chat-toggle-button"
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? "Close chat assistant" : "Open chat assistant"}
      >
        <div className="chat-icon">
          {isOpen ? (
            <span className="close-icon">×</span>
          ) : (
            <>
              <span className="helper-icon">💬</span>
              <span className="pulse-ring"></span>
            </>
          )}
        </div>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-container"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-title">
                <span className="chat-logo">🛡️</span>
                <h3>SafeHaven Assistant</h3>
              </div>
              <div className="status-indicator">
                <span className="status-dot"></span>
                <span className="status-text">Online</span>
              </div>
            </div>

            {/* Messages container */}
            <div className="messages-container">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`message ${message.sender === 'bot' ? 'bot-message' : 'user-message'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {message.sender === 'bot' && (
                    <div className="bot-avatar">
                      <span role="img" aria-label="SafeHaven Bot">🛡️</span>
                    </div>
                  )}
                  <div className="message-bubble">
                    <p>{message.text}</p>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="message bot-message">
                  <div className="bot-avatar">
                    <span role="img" aria-label="SafeHaven Bot">🛡️</span>
                  </div>
                  <div className="message-bubble typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Type your message here..."
                className="chat-input"
                ref={inputRef}
              />
              <motion.button
                type="submit"
                className="send-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Send message"
                disabled={inputValue.trim() === ''}
              >
                <span className="send-icon">➤</span>
              </motion.button>
            </form>

            {/* Quick suggestions */}
            <div className="quick-suggestions">
              <motion.button
                onClick={() => handleQuickSuggestion("How do I use SOS?")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                SOS Help
              </motion.button>
              <motion.button
                onClick={() => handleQuickSuggestion("How does location sharing work?")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Location Sharing
              </motion.button>
              <motion.button
                onClick={() => handleQuickSuggestion("How does the safety map work?")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Safety Map
              </motion.button>
              <motion.button
                onClick={() => handleQuickSuggestion("What is discreet mode?")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Discreet Mode
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;