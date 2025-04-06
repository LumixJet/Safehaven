import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link as ScrollLink } from 'react-scroll';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('Home');
  const { isAuthenticated } = useAuth() || {}; // Fallback in case useAuth is undefined
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { name: 'Home', icon: '🏠', to: '/', isRoute: true },
    { name: 'Features', icon: '✨', to: 'features', isRoute: false },
    { name: 'Testimonials', icon: '💬', to: 'testimonials', isRoute: false },
    { name: 'Contact', icon: '📞', to: 'footer', isRoute: false },
  ];

  const navVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.nav
      className={`navbar ${isScrolled ? 'navbar-scrolled' : 'navbar-default'}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="navbar-container">
        <motion.div
          className="navbar-logo"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="logo-icon">
            <span className="logo-shield">
              <span className="logo-checkmark"></span>
            </span>
          </div>
          <h2>SafeHaven</h2>
        </motion.div>

        <motion.div
          className="navbar-links desktop-menu"
          variants={navVariants}
          initial="hidden"
          animate="visible"
        >
          <ul>
            {menuItems.map((item) => (
              <motion.li
                key={item.name}
                variants={itemVariants}
                className={activeItem === item.name ? 'active' : ''}
              >
                {item.isRoute ? (
                  <RouterLink
                    to={item.to}
                    onClick={() => setActiveItem(item.name)}
                    className="nav-link"
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-text">{item.name}</span>
                  </RouterLink>
                ) : (
                  <ScrollLink
                    to={item.to}
                    smooth={true}
                    duration={500}
                    offset={-80}
                    onClick={() => {
                      setActiveItem(item.name);
                      navigate('/'); // Ensure we're on home page for scrolling
                    }}
                    className="nav-link"
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-text">{item.name}</span>
                  </ScrollLink>
                )}
                {activeItem === item.name && (
                  <motion.div
                    className="active-indicator"
                    layoutId="activeIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.button
          className="navbar-cta"
          whileHover={{
            scale: 1.05,
            boxShadow: '0 5px 15px rgba(71, 119, 254, 0.3)',
          }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onClick={() => navigate('/dashboard')}
        >
          <span className="btn-icon">📊</span>
          <span>Dashboard</span>
        </motion.button>

        <div className="mobile-menu-container">
          <motion.div
            className={`menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="hamburger">
              <span className="line line1"></span>
              <span className="line line2"></span>
              <span className="line line3"></span>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ul>
              {menuItems.map((item) => (
                <motion.li
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className={activeItem === item.name ? 'active' : ''}
                >
                  {item.isRoute ? (
                    <RouterLink
                      to={item.to}
                      onClick={() => {
                        setActiveItem(item.name);
                        setIsMobileMenuOpen(false);
                      }}
                      className="nav-link"
                    >
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-text">{item.name}</span>
                    </RouterLink>
                  ) : (
                    <ScrollLink
                      to={item.to}
                      smooth={true}
                      duration={500}
                      offset={-80}
                      onClick={() => {
                        setActiveItem(item.name);
                        setIsMobileMenuOpen(false);
                        navigate('/');
                      }}
                      className="nav-link"
                    >
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-text">{item.name}</span>
                    </ScrollLink>
                  )}
                </motion.li>
              ))}
            </ul>
            <motion.button
              className="mobile-cta"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => {
                navigate('/dashboard');
                setIsMobileMenuOpen(false);
              }}
            >
              Dashboard
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;