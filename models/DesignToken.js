const mongoose = require('mongoose');

const designTokenSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    index: true 
  },
  category: { 
    type: String, 
    required: true, 
    index: true 
  },
  value: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  tags: [{ 
    type: String, 
    index: true 
  }],
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
designTokenSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text' 
});

// Compound index for performance
designTokenSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('DesignToken', designTokenSchema);