import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAuthenticated, loading, logout, updateProfile, changePassword, error, setError } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  useEffect(() => {
    setError(null);
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated && !loading) {
    return <Navigate to="/login" />;
  }

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
    setMessage({ type: '', text: '' });
    if (error) setError(null);
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    setMessage({ type: '', text: '' });
    if (error) setError(null);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      await updateProfile(profileData);
      setMessage({ 
        type: 'success', 
        text: 'Profile updated successfully!' 
      });
      setEditing(false);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: error || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setMessage({ type: '', text: '' });
    
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLocalLoading(false);
      return;
    }
    
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      setLocalLoading(false);
      return;
    }
    
    try {
      await changePassword(currentPassword, newPassword);
      setMessage({ 
        type: 'success', 
        text: 'Password changed successfully!' 
      });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setChangingPassword(false);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: error || 'Failed to change password. Please check your current password.' 
      });
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>SafeHaven</h2>
        </div>
        <div className="sidebar-menu">
          <button 
            className={`menu-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-user"></i>
            <span>Profile</span>
          </button>
          <button 
            className="menu-item logout"
            onClick={logout}
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>
            {activeTab === 'profile' && 'My Profile'}
            {activeTab === 'safety' && 'Safety Map'}
            {activeTab === 'emergency' && 'Emergency Contacts'}
            {activeTab === 'notifications' && 'Notifications'}
          </h1>
          <div className="user-welcome">
            Welcome, {user?.name || 'User'}
          </div>
        </div>
        
        {message.text && (
          <div className={`message-container ${message.type}`}>
            <div className={`message ${message.type}`}>{message.text}</div>
          </div>
        )}
        
        {activeTab === 'profile' && (
          <div className="content-section profile-section">
            <div className="card">
              <div className="card-header">
                <h2>Personal Information</h2>
                {!editing ? (
                  <button 
                    className="edit-button"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setEditing(false);
                      if (user) {
                        setProfileData({
                          name: user.name || '',
                          email: user.email || '',
                          phone: user.phone || ''
                        });
                      }
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              <div className="card-body">
                {!editing ? (
                  <div className="profile-details">
                    <div className="detail-item">
                      <label>Name:</label>
                      <span>{user?.name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{user?.email}</span>
                    </div>
                    <div className="detail-item">
                      <label>Phone:</label>
                      <span>{user?.phone || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Account Created:</label>
                      <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Last Login:</label>
                      <span>{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Unknown'}</span>
                    </div>
                    
                    <div className="password-section">
                      <h3>Password</h3>
                      {!changingPassword ? (
                        <button 
                          className="change-password-button"
                          onClick={() => setChangingPassword(true)}
                        >
                          Change Password
                        </button>
                      ) : (
                        <form onSubmit={handlePasswordSubmit} className="password-form">
                          <div className="form-group">
                            <label htmlFor="currentPassword">Current Password</label>
                            <input
                              type="password"
                              id="currentPassword"
                              name="currentPassword"
                              value={passwordData.currentPassword}
                              onChange={handlePasswordChange}
                              required
                              placeholder="Enter your current password"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input
                              type="password"
                              id="newPassword"
                              name="newPassword"
                              value={passwordData.newPassword}
                              onChange={handlePasswordChange}
                              required
                              placeholder="Enter your new password"
                              minLength="8"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                              type="password"
                              id="confirmPassword"
                              name="confirmPassword"
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordChange}
                              required
                              placeholder="Confirm your new password"
                              minLength="8"
                            />
                          </div>
                          
                          <div className="password-form-actions">
                            <button 
                              type="submit" 
                              className="save-button"
                              disabled={localLoading}
                            >
                              {localLoading ? 'Updating...' : 'Update Password'}
                            </button>
                            <button 
                              type="button" 
                              className="cancel-button"
                              onClick={() => {
                                setChangingPassword(false);
                                setPasswordData({
                                  currentPassword: '',
                                  newPassword: '',
                                  confirmPassword: ''
                                });
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="profile-form">
                    <div className="form-group">
                      <label htmlFor="name">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileChange}
                        required
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        required
                        placeholder="Your email address"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        placeholder="Your phone number (optional)"
                        pattern="[0-9]{10}"
                        title="Please enter a valid 10-digit phone number"
                      />
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="save-button"
                        disabled={localLoading}
                      >
                        {localLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;