const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

// login route
router.post('/login', authController.login);

// logout route
router.post('/logout', authController.logout);

// verify token route - needs authentication
router.get('/verify', authenticateToken, authController.verifyToken);

module.exports = router;


