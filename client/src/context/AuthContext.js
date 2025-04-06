import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance, { setAuthToken } from './axiosInstance'; //axiosInstance is used for fetching data

export const AuthContext = createContext(); //setting up authorization part

//we are setting up AuthProvider function which will have following function as its features
//means if I import AuthProvider all the features will be imported there also
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //useEffect is React hook which is used to setAuthToken which utilizes our variable token
  useEffect(() => { //this token variable will be initialized later
    setAuthToken(token);
  }, [token]);

  //we are setting up user on website this is mediator between frontend and backend  so here we set
  //token call APIs and check for authentication and more
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false); //if token is false that means loading state will be false then we return
        return;
      }

      //setting up API path for fetching and validating user data if data is not valid then not allow
      try {
        const res = await axiosInstance.get('/api/auth/me');
        if (!res.data?.data) {
          throw new Error('Invalid user data received');
        }
        setUser(res.data.data);
        setIsAuthenticated(true);
        setLoading(false);
        setError(null);
      } catch (err) { //if error occur between validating user data then we send console error and 
        console.error('Auth Error:', err.response?.data || err.message); //remove token
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        setError('Session expired. Please log in again.');
      }
    };

    loadUser(); //if error does not occur and if user data and token is valid then load the user 
  }, [token]);

  // Register user (how registration works interally)
  const register = async (name, email, password, phone) => {
    const config = { //here we are accepting JSON data which is as user input 
      headers: {
        'Content-Type': 'application/json',
      },
    };
    //data if not in string we convert all that JSON data in string as it becomes easy
    const body = JSON.stringify({ name, email, password, phone });

    try { //we are sending the data to server(backend) with the help of following path
      const res = await axiosInstance.post('/api/auth/register', body, config);
      if (!res.data?.token) { //so we validating data and token from server 
        throw new Error('Invalid response from server');
      }
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setIsAuthenticated(true);
      setError(null);
      return res.data;
    } catch (err) { //error which can occur due to server crash or malfunctioning of server
      console.error('Registration Error:', err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' && err.response.data) ||
        'Registration failed. Please try again.';
      setError(errorMsg);
      throw err;
    }
  };

  //Like we did for sign-up page now we do for Login page basically we are taking login data and 
  //accepting it to JSON data later converting data in JSON to string then checking for errors from 
  //server which can occur due to server crash or malfunctioning or incorrect API setup (for backend)
  const login = async (email, password) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = JSON.stringify({ email, password });

    try {
      const res = await axiosInstance.post('/api/auth/login', body, config);
      if (!res.data?.token) {
        throw new Error('Invalid response from server');
      }
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setIsAuthenticated(true);
      setError(null);
      return res.data;
    } catch (err) {
      console.error('Login Error:', err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' && err.response.data) ||
        'Login failed. Please try again.';
      setError(errorMsg);
      throw err;
    }
  };

  //in Dashboard we have Edit Profile basically we are editing login data and 
  //accepting it to JSON data now that data will be alrady is string then checking for errors from 
  //server which can occur due to server crash or malfunctioning or incorrect API setup (for backend)
  const updateProfile = async (userData) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const res = await axiosInstance.put('/api/auth/update', userData, config);
      if (!res.data?.data) {
        throw new Error('Invalid profile update response');
      }
      setUser(res.data.data);
      return res.data;
    } catch (err) {
      console.error('Update Profile Error:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.error || 'Profile update failed';
      setError(errorMsg);
      throw err;
    }
  };

  // For Change password present in dashboard accepting password as JSON data now that password can be
  //anything so converting it into string  then checking for errors from 
  //server which can occur due to server crash or malfunctioning or incorrect API setup (for backend)
  const changePassword = async (currentPassword, newPassword) => {
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const body = JSON.stringify({ currentPassword, newPassword });

    try {
      const res = await axiosInstance.put('/api/auth/password', body, config);
      return res.data;
    } catch (err) {
      console.error('Password Change Error:', err.response?.data || err.message);
      const errorMsg = err.response?.data?.error || 'Password change failed';
      setError(errorMsg);
      throw err;
    }
  };

  //once from dashboard if user wants to logout the request is sent to server through path and 
  //if there is some error in server side like malfunction ot server crash we show Logout error 
  //which will be shown in console which we will be able to see by going through inspect
  const logout = async () => {
    try {
      await axiosInstance.get('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.response?.data || err.message);
    }

    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    // Navigation is handled by the calling component
  };


  //now as this content of AuthContext are setup now we can use throughout the project because we 
  //we have mentioned export AuthContext.provider below
  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        loading,
        user,
        error,
        register,
        login,
        logout,
        updateProfile,
        changePassword,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

//Custom hook to use the AuthContext for validating our data from backend
export const useAuth = () => {
  return useContext(AuthContext);
};
//to use Authprovider component throughout the website
export default AuthProvider;