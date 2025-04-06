const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const ms = require('ms');
const bcrypt = require('bcryptjs');

/**
 * @desc    User Registration Controller
 * @route   POST /api/auth/register
 * @access  Public
 * 
 * Handles user registration process with comprehensive validation
 */
exports.register = asyncHandler(async (req, res, next) => {
  // Debug logging to track registration attempts
  console.log('Register endpoint hit:', req.body);

  // Extract user registration details from request body
  const { name, email, password, phone } = req.body;

  // Validate required fields - ensure name, email, and password are provided
  if (!name || !email || !password) {
    return next(new ErrorResponse('Please provide name, email, and password', 400));
  }

  // Check if user with the same email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('Email already in use', 400));
  }

  // Create new user in the database
  const user = await User.create({
    name,
    email,
    password,
    phone,
  });

  // Generate and send authentication token
  sendTokenResponse(user, 201, res);
});

/**
 * @desc    User Login Controller
 * @route   POST /api/auth/login
 * @access  Public
 * 
 * Handles user authentication with credential verification
 */
exports.login = asyncHandler(async (req, res, next) => {
  // Debug logging to track login attempts
  console.log('Login endpoint hit:', req.body);

  // Extract login credentials
  const { email, password } = req.body;

  // Validate that both email and password are provided
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Find user by email, explicitly selecting password field
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Verify password using custom method
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login timestamp
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Generate and send authentication token
  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Get Current User Profile
 * @route   GET /api/auth/me
 * @access  Private (Authenticated users only)
 * 
 * Retrieves and returns the current logged-in user's profile
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  // Debug logging to track profile retrieval
  console.log('GetMe endpoint hit:', req.user.id);

  // Find user by ID from authenticated request
  const user = await User.findById(req.user.id);

  // Handle case where user is not found
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Return user profile data
  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update User Profile
 * @route   PUT /api/auth/update
 * @access  Private (Authenticated users only)
 * 
 * Allows users to update their profile information
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  // Debug logging to track profile update attempts
  console.log('UpdateProfile endpoint hit:', req.body);

  // Extract updatable fields
  const { name, email, phone } = req.body;

  // Create an object to store validated update fields
  const updateData = {};

  // Conditionally add fields to update
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;

  // Handle email updates with additional validation
  if (email && email !== req.user.email) {
    // Check if new email is already in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('Email already in use', 400));
    }
    updateData.email = email;
  }

  // Perform the update with validation
  const user = await User.findByIdAndUpdate(req.user.id, updateData, {
    new: true,           // Return the modified document
    runValidators: true, // Run model validations
  });

  // Return updated user data
  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Change User Password
 * @route   PUT /api/auth/password
 * @access  Private (Authenticated users only)
 * 
 * Allows users to change their account password
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
  // Debug logging to track password change attempts
  console.log('ChangePassword endpoint hit');

  // Extract current and new passwords
  const { currentPassword, newPassword } = req.body;

  // Validate input fields
  if (!currentPassword || !newPassword) {
    return next(new ErrorResponse('Please provide current and new password', 400));
  }

  // Retrieve user with password field
  const user = await User.findById(req.user.id).select('+password');

  // Verify current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Send success response
  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});

/**
 * @desc    User Logout
 * @route   GET /api/auth/logout
 * @access  Private (Authenticated users only)
 * 
 * Logs out the user by clearing the authentication token
 */
exports.logout = asyncHandler(async (req, res, next) => {
  // Debug logging to track logout attempts
  console.log('Logout endpoint hit');

  // Clear authentication token cookie
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true,
  });

  // Send successful logout response
  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * Helper function to generate and send authentication token
 * 
 * @param {Object} user - User document
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Generate JWT token for the user
  const token = user.getSignedJwtToken();

  // Parse token expiration from environment variable
  const expiresIn = ms(process.env.JWT_COOKIE_EXPIRE || '30d');

  // Configure cookie options
  const options = {
    expires: new Date(Date.now() + expiresIn),
    httpOnly: true, // Prevent client-side JavaScript access
  };

  // Add secure flag in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Send response with token
  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
    });
};