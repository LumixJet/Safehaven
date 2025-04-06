import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>SafeHaven</h3>
          <p>Your Personal Safety Companion</p>
        </div>
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li>Home</li>
            <li>Features</li>
            <li>Testimonials</li>
            <li>About</li>
            <li>Contact</li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Connect</h4>
          <div className="social-icons">
            <i className="fab fa-facebook"></i>
            <i className="fab fa-twitter"></i>
            <i className="fab fa-instagram"></i>
            <i className="fab fa-linkedin"></i>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2025 SafeHaven. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
