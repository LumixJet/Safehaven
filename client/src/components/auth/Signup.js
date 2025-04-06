import React, { useState } from 'react'; //same as login.js we impot same library here also
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Auth.css';

const Signup = () => {
  //useState is a hook of React which we use impot functions like here setFormData for handling 
  //input values of the form following are varoiables which will be there in sign-up page
  const [formData, setFormData] = useState({
    name: '',             // User's full name
    email: '',            // User's email address
    phone: '',            // User's phone number (optional)
    password: '',         // User's password
    confirmPassword: ''  // Password confirmation
  });

  // Error and Loading States
  const [error, setError] = useState(''); //all defined Error will be handled
  const [loading, setLoading] = useState(false); //Loading state during registration is false after 
                                                //that it is said to be true

  //React.useContext amd useNNavigate are ract hooks and AuthContext is self made function
  const { register } = React.useContext(AuthContext); //Auth Context function which help in registration
  const navigate = useNavigate(); //After sign-up what will be the flow of website

  //To access these in hook we are setting it up locally hook takes data from line 26 to line 10
  const { name, email, phone, password, confirmPassword } = formData;

  // Handle input changes dynamically
  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  }; //user enters data then data is fetched by formData is local which is used by setFormData (hook)

  //Form submission handler with comprehensive validation and error handling
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission 
    setError(''); // Reset error state

    // Client-side validation weather the password and confirm password is same or not
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true); // Set loading state

    try {
      //wait for a time till all the 4 data is filled by the user
      await register(name, email, password, phone);
      
      //if user fills correct data Redirect to dashboard
      navigate('/dashboard');
    } 
    catch (err) {
      // Comprehensive error handling for response related error that is from 58 to 72
      if (err.response) {
        const errorData = err.response.data;
        
        // Handle specific error scenarios 1. user does not post valid string 2. Alreasy user exists
        //3.Registration failed that means any other type of error has occured from user side
        if (typeof errorData === 'string' && errorData.includes('Cannot POST')) {
          setError('Server error: Unable to process registration. Please try again later.');
        } else if (errorData?.error) {
          if (errorData.error.includes('already exists')) {
            setError('This email is already registered. Please use a different email.');
          } else {
            setError(errorData.error);
          }
        } else {
          setError('Registration failed. Please try again.');
        }
      } else if (err.request) {
        // Network error else if case
        setError('Network error. Please check your internet connection.');
      } else {
        // Unexpected error else case
        setError('An unexpected error occurred. Please try again.');
      }
      
      setLoading(false); // Reset loading state means if error is catched then loading is set to false
    }
  };

  return (
    <div className="auth-container">
      {/* Setting Decorative elements background gradient color in signup page (optional) */}
      <div className="gradient-overlay"></div>
      <div className="particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`particle particle-${i}`}></div>
        ))}
      </div>

      {/* Signup Card */}
      <div className="auth-card">
        {/* Page Header */}
        <div className="auth-header">
          <h2>Create Your Account</h2>
          <p>Join SafeHaven today and stay connected, stay safe</p>
        </div>
        
        {/* Signup Form basically onSubmit will be called when user submits this following data */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Full Name Input */}
          <div className="form-group">
            <label htmlFor="name">FULL NAME</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>
          
          {/* Email Input */}
          <div className="form-group">
            <label htmlFor="email">EMAIL ADDRESS</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              placeholder="Enter your email address"
            />
          </div>
          
          {/* Phone Number Input */}
          <div className="form-group">
            <label htmlFor="phone">PHONE NUMBER</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={phone}
              onChange={handleChange}
              placeholder="Enter your phone number (optional)"
              pattern="[0-9]{10}"
              title="Please enter a valid 10-digit phone number"
            />
          </div>
          
          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password">PASSWORD</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handleChange}
              required
              placeholder="Create a password (min. 8 characters)"
              minLength="8"
            />
          </div>
          
          {/* Confirm Password Input */}
          <div className="form-group">
            <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              minLength="8"
            />
          </div>
          
          {/* Submit or sign-up Button */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="primary-button"
              disabled={loading} //we initially disable loading untill registration gets successfull
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>
        
        {/* Error Message Display if error occurs which we have defined above */}
        {error && (
          <div className="error-message-container">
            <div className="error-message">{error}</div>
          </div>
        )}
        
        {/* Footer Links */}
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="gradient-text">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};
//for using sign-up components and function we use export default line
export default Signup;