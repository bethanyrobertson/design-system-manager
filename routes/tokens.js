// routes/tokens.js
const express = require('express');
const mongoose = require('mongoose');
const DesignToken = require('../models/DesignToken');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all tokens
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      category, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {};
    
    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tokens = await DesignToken.find(query)
      .populate('createdBy', 'username')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DesignToken.countDocuments(query);

    res.json({
      tokens,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single token
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid token ID format' });
    }

    const token = await DesignToken.findById(req.params.id)
      .populate('createdBy', 'username email');
    
    if (!token) {
      return res.status(404).json({ error: 'Design token not found' });
    }

    res.json(token);
  } catch (error) {
    console.error('Get token by id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create token
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, category, value, description, tags } = req.body;

    if (!name || !category || !value) {
      return res.status(400).json({ error: 'Name, category, and value are required' });
    }

    // DEBUG: Log the user object to see what's wrong
    console.log('DEBUG - req.user:', req.user);
    console.log('DEBUG - req.user.id:', req.user.id);
    console.log('DEBUG - typeof req.user.id:', typeof req.user.id);

    // Validate that we have a proper ObjectId
    let userId;
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      userId = req.user.id;
    } else {
      console.error('Invalid user ID format:', req.user.id);
      return res.status(401).json({ error: 'Invalid user authentication - please log in again' });
    }

    const token = new DesignToken({
      name,
      category,
      value,
      description,
      tags: tags || [],
      createdBy: userId
    });

    await token.save();
    await token.populate('createdBy', 'username');

    res.status(201).json(token);
  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk upload tokens from JSON
router.post('/upload', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { tokens } = req.body;

    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({ error: 'Invalid format. Expected { "tokens": [...] }' });
    }

    const results = {
      success: [],
      errors: [],
      skipped: []
    };

    for (let i = 0; i < tokens.length; i++) {
      const tokenData = tokens[i];
      
      try {
        // Validate required fields
        if (!tokenData.name || !tokenData.category || !tokenData.value) {
          results.errors.push({
            index: i,
            data: tokenData,
            error: 'Missing required fields: name, category, value'
          });
          continue;
        }

        // Check if token already exists
        const existingToken = await DesignToken.findOne({ name: tokenData.name });
        if (existingToken) {
          results.skipped.push({
            index: i,
            data: tokenData,
            reason: `Token '${tokenData.name}' already exists`
          });
          continue;
        }

        // Create new token
        const token = new DesignToken({
          name: tokenData.name,
          category: tokenData.category,
          value: tokenData.value,
          description: tokenData.description || '',
          tags: Array.isArray(tokenData.tags) ? tokenData.tags : [],
          createdBy: req.user.id
        });

        await token.save();
        await token.populate('createdBy', 'username');

        results.success.push({
          index: i,
          token: token
        });

      } catch (error) {
        results.errors.push({
          index: i,
          data: tokenData,
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: `Upload complete. ${results.success.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update token
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid token ID format' });
    }

    const { name, category, value, description, tags } = req.body;

    const token = await DesignToken.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ error: 'Design token not found' });
    }

    // Check ownership or admin role
    if (token.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    Object.assign(token, {
      name: name || token.name,
      category: category || token.category,
      value: value || token.value,
      description: description !== undefined ? description : token.description,
      tags: tags || token.tags,
      updatedAt: new Date()
    });

    await token.save();
    await token.populate('createdBy', 'username');

    res.json(token);
  } catch (error) {
    console.error('Update token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete token
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid token ID format' });
    }

    const token = await DesignToken.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ error: 'Design token not found' });
    }

    // Check ownership or admin role
    if (token.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await DesignToken.findByIdAndDelete(req.params.id);
    res.json({ message: 'Design token deleted successfully' });
  } catch (error) {
    console.error('Delete token error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;