import React from 'react';
import { motion } from 'framer-motion';
import './Features.css';

const features = [
  { icon: '🆘', title: 'SOS Alerts', 
    description: 'Send instant alerts to emergency contacts with one tap.' },
  { 
    icon: '🗺️', 
    title: 'Safety Map', 
    description: 'View and contribute to community safety information in your area.',
    link: '/safety-map' 
  },
  { icon: '📸', title: 'Incident Reporting', description: 'Report and document safety concerns and help us train our model better.' },
  { icon: '🔔', title: 'Smart Notifications', description: 'Receive alerts about potential safety risks in your vicinity.' },
  { icon: '👥', title: 'Trusted Network', description: 'Build a network of trusted contacts for enhanced safety.' },
  { 
    icon: '📍', 
    title: 'Live Location', 
    description: 'Share your real-time location with trusted contacts securely.',
  },
];

const Features = () => {
  return (
    <section className="features">
      <h2>Key Features</h2>
      <div className="features-grid">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Features;
