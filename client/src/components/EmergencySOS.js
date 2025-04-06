import React, { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiAlertCircle, FiEdit2, FiPlus, FiX } from 'react-icons/fi';
import './EmergencySOS.css';

// Make it configurable and easier to change
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'; 

const EmergencySOS = () => {
  const [contacts, setContacts] = useState([]);
  const [location, setLocation] = useState(null);
  const [sending, setSending] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [editingContactId, setEditingContactId] = useState(null);
  const [serverStatus, setServerStatus] = useState('unknown');

  useEffect(() => {
    // Check server status
    checkServerHealth();
    getInitialLocation();
    startLocationWatching();
    loadContacts();

    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // New function to check server health
  const checkServerHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setServerStatus('online');
        console.log('Server is online and healthy');
      } else {
        setServerStatus('error');
        console.error('Server health check failed:', await response.text());
      }
    } catch (error) {
      setServerStatus('offline');
      console.error('Server appears to be offline:', error);
    }
  };

  const loadContacts = () => {
    const savedContacts = localStorage.getItem('emergencyContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  };

  const saveContacts = (updatedContacts) => {
    localStorage.setItem('emergencyContacts', JSON.stringify(updatedContacts));
    setContacts(updatedContacts);
  };

  const getInitialLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location fetched:', position.coords);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        toast.success('Location fetched successfully!');
      },
      (error) => {
        console.error('Geolocation error:', error.code, error.message);
        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Ensure location services are enabled.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Trying again...';
            setTimeout(getInitialLocation, 2000);
            break;
          default:
            errorMessage = 'Unable to access your location. Please try again.';
        }
        toast.error(errorMessage);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const startLocationWatching = () => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        console.log('Location updated:', position.coords);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error('Watch location error:', error.code, error.message);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
    );
    setWatchId(id);
  };

  const attemptManualShare = useCallback(() => {
    if (!location) return;
    
    const locationLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = `EMERGENCY SOS ALERT: I need help! My current location is: ${locationLink}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'EMERGENCY SOS',
        text: message,
        url: locationLink,
      }).catch(shareError => {
        console.error('Share API error:', shareError);
        // Fallback for share API errors - copy to clipboard
        navigator.clipboard.writeText(message)
          .then(() => toast.info('Emergency message copied to clipboard. Please paste it to your messaging app.'))
          .catch(err => console.error('Clipboard write failed:', err));
      });
    } else {
      // Fallback for browsers that don't support Share API
      navigator.clipboard.writeText(message)
        .then(() => toast.info('Emergency message copied to clipboard. Please paste it to your messaging app.'))
        .catch(err => console.error('Clipboard write failed:', err));
    }
  }, [location]);

  const sendSOS = useCallback(async () => {
    if (!location) {
      toast.error('Unable to get your location. Please try again.');
      getInitialLocation();
      return;
    }
  
    if (contacts.length === 0) {
      toast.warning('Please add at least one emergency contact first.');
      setShowContactModal(true);
      return;
    }
  
    if (!window.confirm('Are you sure you want to send an emergency SOS alert?')) {
      return;
    }
  
    setSending(true);
  
    // Check server status before attempting to send
    if (serverStatus !== 'online') {
      await checkServerHealth();
    }
  
    try {
      const locationLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      const message = `EMERGENCY SOS ALERT: I need help! My current location is: ${locationLink}`;
  
      console.log('Attempting to send SOS to:', `${API_BASE_URL}/api/send-sos`);
      console.log('Request payload:', {
        contacts: contacts.map(c => c.phone),
        message,
        location,
      });
  
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
      const response = await fetch(`${API_BASE_URL}/api/send-sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: contacts.map(c => c.phone),
          message,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp,
          },
        }),
        signal: controller.signal
      });
  
      clearTimeout(timeoutId);
  
      console.log('Fetch response status:', response.status, response.statusText);
      const result = await response.json();
      console.log('Backend response:', result);
  
      if (!response.ok) {
        throw new Error(result.message || `Failed to send SOS (Status: ${response.status})`);
      }
  
      // Check if any messages failed
      if (result.failed && result.failed.length > 0) {
        toast.warning(`SOS sent to some contacts, but failed for: ${result.failed.map(f => f.phone).join(', ')}`);
        // Try manual sharing as fallback
        attemptManualShare();
      } else {
        toast.success('SOS alert sent successfully to your emergency contacts!');
      }
    } catch (error) {
      console.error('SOS Error Details:', error);
      
      if (error.name === 'AbortError') {
        toast.error('Connection to the server timed out. Using backup method.');
      } else {
        toast.error(`Failed to send SOS: ${error.message}. Using backup method.`);
      }
      
      // Use manual share as fallback
      attemptManualShare();
    } finally {
      setSending(false);
    }
  }, [location, contacts, serverStatus, attemptManualShare]);

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) {
      toast.error('Please enter both name and phone number.');
      return;
    }

    const phonePattern = /^\+[0-9\s\-()]{7,20}$/;
    if (!phonePattern.test(newContact.phone)) {
      toast.error('Please enter a valid phone number with country code (e.g., +1...).');
      return;
    }

    let updatedContacts;
    if (editingContactId !== null) {
      updatedContacts = contacts.map(contact =>
        contact.id === editingContactId ? { ...newContact, id: editingContactId } : contact
      );
    } else {
      const newContactWithId = {
        ...newContact,
        id: Date.now(),
      };
      updatedContacts = [...contacts, newContactWithId];
    }

    saveContacts(updatedContacts);
    setNewContact({ name: '', phone: '' });
    setEditingContactId(null);
    toast.success(editingContactId !== null ? 'Contact updated successfully!' : 'Contact added successfully!');
  };

  const handleEditContact = (contact) => {
    setNewContact({ name: contact.name, phone: contact.phone });
    setEditingContactId(contact.id);
  };

  const handleDeleteContact = (id) => {
    if (window.confirm('Are you sure you want to remove this emergency contact?')) {
      const updatedContacts = contacts.filter(contact => contact.id !== id);
      saveContacts(updatedContacts);
      toast.success('Contact removed successfully!');
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} />
      <div className="sos-container">
        {serverStatus === 'offline' && (
          <div className="server-status-warning">
            Server is offline. SOS messages will be shared via your device's share function.
          </div>
        )}
        
        <button
          className={`sos-button ${sending ? 'sending' : ''}`}
          onClick={sendSOS}
          disabled={sending}
          aria-label="Send Emergency SOS"
        >
          <FiAlertCircle size={24} />
          <span>{sending ? 'Sending...' : 'SOS'}</span>
        </button>

        <div className="sos-info">
          <div className="sos-contacts-preview">
            <h3>Emergency Contacts ({contacts.length})</h3>
            {contacts.length > 0 ? (
              <div className="contacts-summary">
                {contacts.slice(0, 2).map(contact => (
                  <div key={contact.id} className="contact-preview">
                    {contact.name}
                  </div>
                ))}
                {contacts.length > 2 && (
                  <div className="contact-preview">+{contacts.length - 2} more</div>
                )}
              </div>
            ) : (
              <p className="no-contacts">No emergency contacts added</p>
            )}
            <button className="manage-contacts-btn" onClick={() => setShowContactModal(true)}>
              Manage Contacts
            </button>
          </div>
        </div>
      </div>

      {showContactModal && (
        <div className="modal-overlay">
          <div className="contact-modal">
            <div className="modal-header">
              <h2>Emergency Contacts</h2>
              <button
                className="close-modal"
                onClick={() => {
                  setShowContactModal(false);
                  setNewContact({ name: '', phone: '' });
                  setEditingContactId(null);
                }}
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="contacts-list">
              {contacts.length > 0 ? (
                contacts.map(contact => (
                  <div key={contact.id} className="contact-item">
                    <div className="contact-info">
                      <span className="contact-name">{contact.name}</span>
                      <span className="contact-phone">{contact.phone}</span>
                    </div>
                    <div className="contact-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditContact(contact)}
                        aria-label="Edit contact"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteContact(contact.id)}
                        aria-label="Delete contact"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-contacts-message">No emergency contacts added yet.</p>
              )}
            </div>

            <div className="add-contact-form">
              <h3>{editingContactId !== null ? 'Edit Contact' : 'Add New Contact'}</h3>
              <div className="form-group">
                <label htmlFor="contactName">Name</label>
                <input
                  id="contactName"
                  type="text"
                  placeholder="Contact Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactPhone">Phone Number</label>
                <input
                  id="contactPhone"
                  type="tel"
                  placeholder="Enter with country code (+1...)"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                />
              </div>
              <div className="form-actions">
                {editingContactId !== null && (
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setNewContact({ name: '', phone: '' });
                      setEditingContactId(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button className="save-btn" onClick={handleAddContact}>
                  <FiPlus size={16} />
                  {editingContactId !== null ? 'Update Contact' : 'Add Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencySOS;