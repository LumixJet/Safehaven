import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link as ScrollLink } from 'react-scroll';
import './Hero.css';

const Hero = () => {
  const phoneRef = useRef(null);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!phoneRef.current) return;
      const x = (window.innerWidth / 2 - e.pageX) / 40; // Slightly increased sensitivity
      const y = (window.innerHeight / 2 - e.pageY) / 40; // Slightly increased sensitivity
      phoneRef.current.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${x / 12}deg)`; // Smoothed rotation
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Function to scroll to navbar
  const scrollToNavbar = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <section className="hero-container">
      {/* Enhanced background elements */}
      <div className="hero-background">
        <div className="gradient-overlay"></div>
        <div className="particles">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className={`particle particle-${i}`}></div>
          ))}
        </div>
        <div className="glowing-orbs">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`orb orb-${i}`}></div>
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="hero-content-wrapper">
        {/* Text content */}
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="headline"
          >
            <span className="gradient-text">Safe Living</span> in a <span className="highlight-text">Connected</span> World
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="subheadline"
          >
            Real-time protection and community safety at your fingertips. 
            Navigate your world with confidence using SafeHaven's cutting-edge technology.
          </motion.p>
          
          <motion.div 
            className="cta-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <motion.button
              className="primary-button"
              whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(71, 119, 254, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              aria-label="Explore SafeHaven Solutions"
              onClick={scrollToNavbar}
            >
              <span className="button-icon">🛡️</span>
              <span>Get Protected</span>
            </motion.button>
            
            <ScrollLink
              to="features"
              smooth={true}
              duration={500}
              offset={-80}
            >
              <motion.button
                className="secondary-button"
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.12)" }}
                whileTap={{ scale: 0.95 }}
                aria-label="Learn How It Works"
              >
                <span>How It Works</span>
                <span className="button-icon">→</span>
              </motion.button>
            </ScrollLink>
          </motion.div>
          
          <motion.div 
            className="stats-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Protection</span>
            </div>
            <div className="stat">
              <span className="stat-number">99%</span>
              <span className="stat-label">Reliability</span>
            </div>
            <div className="stat">
              <span className="stat-number">50k+</span>
              <span className="stat-label">Active Users</span>
            </div>
          </motion.div>
        </motion.div>
        
        {/* Enhanced interface showcase with Google Map */}
        <motion.div 
          className="hero-image"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          <div className="image-container" ref={phoneRef}>
            <div className="interface-mockup">
              <div className="interface-header">
                <div className="app-status">
                  <div className="status-dot active"></div>
                  <span>Protected</span>
                </div>
                <span className="interface-title">SafeHaven</span>
                <div className="menu-button">
                  <span className="menu-dot"></span>
                  <span className="menu-dot"></span>
                  <span className="menu-dot"></span>
                </div>
              </div>
              
              {/* Google Map Interface */}
              <div className="map-container">
                <div className="google-map">
                  {/* Map styling */}
                  <div className="map-roads"></div>
                  <div className="map-buildings"></div>
                  
                  {/* User location indicator */}
                  <div className="user-location">
                    <div className="location-pulse"></div>
                    <div className="location-dot"></div>
                  </div>
                  
                  {/* Safe zones */}
                  <div className="safe-zone zone-1"></div>
                  <div className="safe-zone zone-2"></div>
                  <div className="safe-zone zone-3"></div>
                  
                  {/* Alert indicator */}
                  <div className="alert-indicator">
                    <div className="alert-icon">!</div>
                  </div>
                </div>
                
                {/* Map controls */}
                <div className="map-controls">
                  <button className="map-button zoom-in">+</button>
                  <button className="map-button zoom-out">−</button>
                  <button className="map-button locate-me">
                    <span className="locate-icon"></span>
                  </button>
                </div>
                
                {/* Quick actions toolbar */}
                <div className="action-toolbar">
                  <button className="action-button emergency">SOS</button>
                  <button className="action-button share-location">
                    <span className="share-icon"></span>
                  </button>
                  <button className="action-button report">
                    <span className="report-icon"></span>
                  </button>
                </div>
              </div>
              
              {/* App bottom navigation */}
              <div className="app-navigation">
                <div className="nav-item active">
                  <div className="nav-icon map-icon"></div>
                  <span>Map</span>
                </div>
                <div className="nav-item">
                  <div className="nav-icon alerts-icon"></div>
                  <span>Alerts</span>
                </div>
                <div className="nav-item">
                  <div className="nav-icon community-icon"></div>
                  <span>Community</span>
                </div>
                <div className="nav-item">
                  <div className="nav-icon profile-icon"></div>
                  <span>Profile</span>
                </div>
              </div>
            </div>
            
            {/* Enhanced floating elements */}
            <div className="floating-elements">
              <motion.div 
                className="floating-item emergency-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  y: [0, -12, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 1 },
                  scale: { duration: 0.5, delay: 1 },
                  y: { repeat: Infinity, duration: 3, ease: "easeInOut", delay: 1 }
                }}
              >
                <span className="emergency-icon"></span>
                <span>Emergency</span>
              </motion.div>
              
              <motion.div 
                className="floating-item status-indicator"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  y: [0, 10, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 1.2 },
                  scale: { duration: 0.5, delay: 1.2 },
                  y: { repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }
                }}
              >
                <span className="status-dot"></span>
                <span className="status-text">Protected Zone</span>
              </motion.div>
              
              <motion.div 
                className="floating-item notification"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: [0, 8, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.5, delay: 1.4 },
                  scale: { duration: 0.5, delay: 1.4 },
                  x: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.8 }
                }}
              >
                <div className="notification-icon"></div>
                <div className="notification-content">
                  <span className="notification-title">Community Alert</span>
                  <span className="notification-text">2 Friends Nearby</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;