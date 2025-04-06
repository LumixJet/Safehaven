import React, { useState, useEffect } from 'react'; //importing for features useState and useEffect
import { Link, useNavigate } from 'react-router-dom'; //for control flow between the pages
import { useAuth } from '../../context/AuthContext'; //for authentication
import './Auth.css'; //for CSS of this page 

const Login = () => {
  // State Management
  // Initialize state variables for form data(like mail and password),error handling and loading
  const [formData, setFormData] = useState({ //hook present in React library which has function
  //name setFormData where we declare the input which are here Email and password
    email: '',    // User's email input
    password: '' // User's password input
  });
  const [localError, setLocalError] = useState(''); //Local error state (password incorrect,server error)
  const [loading, setLoading] = useState(false); //Loading state during login (after email and password)
  const [successMessage, setSuccessMessage] = useState(''); //Success message state
  
  //exporting different function from AuthContext file which is present in Context folder
  //AuthContext file has this following function present in below line
  const { login, error, setError, isAuthenticated } = useAuth(); // Authentication context
  const navigate = useNavigate(); //initializing Navigation hook for navigating further in website

  //in line-9 we have formData and its constituents are present below
  const { email, password } = formData;

  //Effect to clear authentication errors when component mounts(like if login again you refresh login)
  useEffect(() => {
    setError(null);
  }, []);

  //if user is authenticated we redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Handle input changes and reset error states
  const handleChange = (e) => {
    //Update form data dynamically as user will put accordingly (email and password)
    setFormData({ ...formData, [e.target.name]: e.target.value });
    
    // Clear error messages when user is typing because at that moment error cant occur it happens
    // when user performs certain action such has login
    if (localError) setLocalError('');
    if (error) setError(null);
  };

  //Form submission handler with comprehensive error management
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission (without any data like email and password)
    setLocalError('');  // if any data is incorrect that is local error so we reset the field
    setError(null);     // and make it blank again for again typing correct data
    
    //if email and password are not filled it pops the below message 
    if (!email || !password) {
      return setLocalError('Please fill in all fields');
    }
    
    setLoading(true); //we fill correct data and login the loader shows up (loading) for fraction of sec

    try {
      //Attempt login if we set the data email and password correct then it checks and try
      await login(email, password);
      
      //if that data is correct Show success message and redirect
      setSuccessMessage('Login successful! Redirecting to dashboard...');
      //also we set the timeout time that if login occurs we are directed to dashboard in 1 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } 
    catch (err) {  //if error occurs then we catch it there are 3 types of error 401,404,default
      //Comprehensive error handling (for us to check proper working of features)
      if (err.response) {
        // Server responded with an error
        switch(err.response.status) {
          case 401:
            setLocalError('Invalid email or password. Please try again.');
            break;
          case 404:
            setLocalError('Account not found. Please check your email or sign up.');
            break;
          default:
            setLocalError(err.response.data?.error || 'Login failed. Please try again.');
        }
      } 
      else if (err.request) {
        //Network error if network is slow or something (shown to users)
        setLocalError('Network error. Please check your internet connection.');
      } 
      else {
        //Unexpected error (if any otherkind of error occurs which is not mentioned here)
        setLocalError('An unexpected error occurred. Please try again later.');
      }
    } 
    finally {
      setLoading(false); //if error occurs we stop the loading
    }
  };
//how the layout of the login page will look like 
  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Page Header */}
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Log in to SafeHaven and stay connected, stay safe</p>
        </div>
        
        {/* Error Message Display */}
        {(localError || error) && ( //if local or any error comes up then either of the error would 
          <div className="error-message-container"> 
          {/*show up which is localError || error */}
            <div className="error-message">{localError || error}</div>
          </div>
        )}
        
        {/* Success Message Display */}
        {successMessage && (
          <div className="success-message-container">
            <div className="success-message">{successMessage}</div>
          </div>
        )}
        
        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Input */}
          {/* This code denotes that what all entities will be present in login page */}
          <div className="form-group">
            <label htmlFor="email">EMAIL ADDRESS</label>
            <input 
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange} //this will handle the changes which we make like writing email
              required //this handle change function is defined on line 39
              placeholder="Enter your email address"
            />
          </div>
          
          {/* Password Input same as email which we discussed just above */}
          <div className="form-group"> 
            <label htmlFor="password">PASSWORD</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              minLength="8"
            />
          </div>
          
          {/* Submit or login Button when we does login then we put that details in line 165 */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="primary-button"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>
        </form>
        
        {/* Footer Links basically we do for the footer which is present below login button */}
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup" className="gradient-text">Sign up</Link></p>
          <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
};
// to use this features and components present in login.js throughout the website we use line 180
export default Login;