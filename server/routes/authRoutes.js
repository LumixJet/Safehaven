const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
} = require('../controllers/authController');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;