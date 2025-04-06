import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import EmergencySOS from './components/EmergencySOS';
import SafetyMap from './components/safetyMap/SafetyMap';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

import './App.css';

function App() {
  return (
    <Router>  
      {/* Router used to navigate different pages(main content) present in website(control flow) */}
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<MainContentWithLayout />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardWithLayout /></ProtectedRoute>} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}
// Protected route is used to access website in sequential manner with proper authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }
  //if children which is loading is triggered then if case work otherwise we are directed towards login
  return isAuthenticated ? children : <Navigate to="/login" />;
};
// we check everytime whether user is logged in into website if not then we dont show main content 
const MainContentWithLayout = () => {
  const { isAuthenticated } = useAuth();

// if user is authenticated then we proceed to show the following contnet navigation is done by
// path mentioned using "navigate function" basically this is present in home section
  return isAuthenticated ? (
    <>
      <Navbar />
      <Hero />
      <Features />
      <SafetyMap />
      <Testimonials />
      <EmergencySOS />
      <Chatbot />
      <Footer />
    </>
  ) : (
    <Navigate to="/login" /> 
  );
};

//after login will be directed to dashboard from where we can access the website and it have this content
const DashboardWithLayout = () => {
  return (
    <>
      <Navbar />
      <Dashboard />
      <Footer />
    </>
  );
};

//if authentication for login is successfull then go to dashboard if not then stays same page for login
const LoginPage = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Navigate to="/dashboard" /> : <Login />;
};
//if authentication for sign_up is successfull go to dashboard if not then stays same page for sign_up
const SignupPage = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />;
};
//to reuse the JS function which we defined here throughout entire project
export default App;