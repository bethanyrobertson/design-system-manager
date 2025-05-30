const User = require('../models/User');
const Component = require('../models/Component');

describe('Minimal Tests', () => {
  test('should create user and component', async () => {
    try {
      console.log('🔧 Testing model creation...');
      
      // Create user
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'designer'
      });
      
      await user.save();
      console.log('✅ User created:', user._id);
      
      // Create component
      const component = new Component({
        name: 'Test Component',
        description: 'A test component',
        category: 'button',
        createdBy: user._id
      });
      
      await component.save();
      console.log('✅ Component created:', component._id);
      
      // Test population
      const populatedComponent = await Component.findById(component._id)
        .populate('createdBy', 'username');
      
      console.log('✅ Population worked:', populatedComponent.createdBy.username);
      
      expect(populatedComponent.createdBy.username).toBe('testuser');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  });
});