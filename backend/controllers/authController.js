const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Auth controller - handles login/logout stuff
class AuthController {
  
  // login function
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // check if username and password are provided
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // TODO: In future, should store users in database instead of env vars
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      // verify credentials
      if (username === adminUsername && password === adminPassword) {
        // create token for authentication
        const token = jwt.sign(
          { username },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          token,
          message: 'Login successful'
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // logout function - for now just returns success
 
  async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  // verify token endpoint - returns user data if token is valid
  async verifyToken(req, res) {
    try {
  
      res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();
