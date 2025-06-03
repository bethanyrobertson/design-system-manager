const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'designer'
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('User registered successfully:', email);
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // DEBUG: Check what we got from database
    console.log('Test user login successful:', email);
    console.log('DEBUG - Database user._id:', user._id);
    console.log('DEBUG - typeof user._id:', typeof user._id);
    console.log('DEBUG - user object:', user);

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ENSURE we use the ObjectId correctly
    const token = jwt.sign(
      { 
        id: user._id.toString(), // Convert ObjectId to string
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user (protected route)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Try to get user from database
    try {
      const user = await User.findById(decoded.id);
      if (user) {
        return res.json({
          user: { id: user._id, username: user.username, email: user.email, role: user.role }
        });
      }
    } catch (dbError) {
      console.log('Database error in /me route:', dbError.message);
    }

    // Fallback to token data
    res.json({ user: decoded });
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Try to get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: { 
        _id: user._id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

// Test
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes are working!',
    database: 'MongoDB with User model',
    testCredentials: [
      { email: 'admin@example.com', password: 'password123', role: 'admin' },
      { email: 'designer@example.com', password: 'password', role: 'designer' },
      { email: 'dev@example.com', password: 'dev123', role: 'developer' }
    ],
    instructions: [
      '1. First register a user with POST /api/auth/register',
      '2. Then login with POST /api/auth/login',
      '3. Or use the test credentials above'
    ]
  });
});

router.post('/create-admin', async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      return res.json({ 
        message: 'Admin user already exists', 
        user: { 
          id: existingAdmin._id, 
          username: existingAdmin.username, 
          email: existingAdmin.email, 
          role: existingAdmin.role 
        } 
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });

    await adminUser.save();
    res.json({ 
      message: 'Admin user created successfully', 
      user: { 
        id: adminUser._id, 
        username: adminUser.username, 
        email: adminUser.email, 
        role: adminUser.role 
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
