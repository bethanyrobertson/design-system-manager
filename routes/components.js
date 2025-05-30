const express = require('express');
const Component = require('../models/Component');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all components
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      category, 
      status, 
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

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const components = await Component.find(query)
      .populate('createdBy', 'username')
      .populate('designTokens', 'name category value')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Component.countDocuments(query);

    res.json({
      components,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single component
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const component = await Component.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('designTokens', 'name category value description');
    
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json(component);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create component
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, category, props, code, designTokens, tags, status } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({ error: 'Name, description, and category are required' });
    }

    const component = new Component({
      name,
      description,
      category,
      props: props || [],
      code: code || {},
      designTokens: designTokens || [],
      tags: tags || [],
      status: status || 'draft',
      createdBy: req.user.id
    });

    await component.save();
    await component.populate(['createdBy', 'designTokens']);

    res.status(201).json(component);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update component
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    const component = await Component.findById(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    // Check ownership or admin role for most updates
    if (component.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      // Allow designers to change status to 'review'
      if (req.user.role === 'designer' && Object.keys(updates).length === 1 && updates.status === 'review') {
        // Allow this specific case
      } else {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    // Only admins can approve components
    if (updates.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve components' });
    }

    Object.assign(component, { ...updates, updatedAt: new Date() });
    await component.save();
    await component.populate(['createdBy', 'designTokens']);

    res.json(component);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete component
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const component = await Component.findByIdAndDelete(req.params.id);
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json({ message: 'Component deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;