const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    index: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true, 
    index: true 
  },
  props: [{
    name: String,
    type: String,
    required: Boolean,
    defaultValue: String,
    description: String
  }],
  code: {
    html: String,
    css: String,
    javascript: String
  },
  designTokens: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DesignToken' 
  }],
  tags: [{ 
    type: String, 
    index: true 
  }],
  status: { 
    type: String, 
    enum: ['draft', 'review', 'approved', 'deprecated'], 
    default: 'draft', 
    index: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Text search index
componentSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text' 
});

// Compound index for performance
componentSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Component', componentSchema);