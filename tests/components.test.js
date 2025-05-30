// tests/components.test.js - Component Tests
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const componentRoutes = require('../routes/components');
const Component = require('../models/Component');
const User = require('../models/User');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/components', componentRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Component Routes', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'designer'
    });
    await testUser.save();

    // Create admin user
    adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'hashedpassword',
      role: 'admin'
    });
    await adminUser.save();

    // Generate auth tokens
    authToken = jwt.sign(
      { id: testUser._id, username: testUser.username, role: testUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    adminToken = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  describe('POST /api/components', () => {
    test('should create a new component', async () => {
      const componentData = {
        name: 'Primary Button',
        description: 'Main action button for the application',
        category: 'button',
        code: {
          html: '<button class="btn-primary">Click me</button>',
          css: '.btn-primary { background: #3B82F6; color: white; }'
        },
        tags: ['button', 'primary'],
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/components')
        .set('Authorization', `Bearer ${authToken}`)
        .send(componentData)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'Primary Button');
      expect(response.body).toHaveProperty('description', 'Main action button for the application');
      expect(response.body).toHaveProperty('category', 'button');
      expect(response.body).toHaveProperty('status', 'draft');
      expect(response.body.code).toHaveProperty('html', '<button class="btn-primary">Click me</button>');
      expect(response.body.tags).toEqual(['button', 'primary']);
      expect(response.body.createdBy).toHaveProperty('username', 'testuser');

      // Verify component was created in database
      const component = await Component.findOne({ name: 'Primary Button' });
      expect(component).toBeTruthy();
    });

    test('should not create component without required fields', async () => {
      const componentData = {
        name: 'Incomplete Component'
        // missing description and category
      };

      const response = await request(app)
        .post('/api/components')
        .set('Authorization', `Bearer ${authToken}`)
        .send(componentData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name, description, and category are required');
    });

    test('should default to draft status if not specified', async () => {
      const componentData = {
        name: 'Default Status Component',
        description: 'Component without explicit status',
        category: 'button'
      };

      const response = await request(app)
        .post('/api/components')
        .set('Authorization', `Bearer ${authToken}`)
        .send(componentData)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'draft');
    });

    test('should not create component without authentication', async () => {
      const componentData = {
        name: 'Unauthorized Component',
        description: 'This should fail',
        category: 'button'
      };

      const response = await request(app)
        .post('/api/components')
        .send(componentData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /api/components', () => {
    beforeEach(async () => {
      // Create test components
      const components = [
        {
          name: 'Primary Button',
          description: 'Main action button',
          category: 'button',
          status: 'approved',
          tags: ['button', 'primary'],
          createdBy: testUser._id
        },
        {
          name: 'Secondary Button',
          description: 'Secondary action button',
          category: 'button',
          status: 'draft',
          tags: ['button', 'secondary'],
          createdBy: testUser._id
        },
        {
          name: 'Text Input',
          description: 'Basic text input field',
          category: 'input',
          status: 'review',
          tags: ['input', 'form'],
          createdBy: testUser._id
        }
      ];

      await Component.insertMany(components);
    });

    test('should get all components', async () => {
      const response = await request(app)
        .get('/api/components')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.components).toHaveLength(3);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total', 3);
    });

    test('should filter components by category', async () => {
      const response = await request(app)
        .get('/api/components?category=button')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.components).toHaveLength(2);
      response.body.components.forEach(component => {
        expect(component.category).toBe('button');
      });
    });

    test('should filter components by status', async () => {
      const response = await request(app)
        .get('/api/components?status=approved')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.components).toHaveLength(1);
      expect(response.body.components[0].status).toBe('approved');
    });

    test('should search components by text', async () => {
      const response = await request(app)
        .get('/api/components?search=primary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.components).toHaveLength(1);
      expect(response.body.components[0].name).toBe('Primary Button');
    });

    test('should paginate components', async () => {
      const response = await request(app)
        .get('/api/components?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.components).toHaveLength(2);
      expect(response.body.pagination.current).toBe(1);
      expect(response.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/components/:id', () => {
    let testComponent;

    beforeEach(async () => {
      testComponent = new Component({
        name: 'Test Component',
        description: 'A test component',
        category: 'button',
        status: 'draft',
        createdBy: testUser._id
      });
      await testComponent.save();
    });

    test('should get component by id', async () => {
      const response = await request(app)
        .get(`/api/components/${testComponent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Test Component');
      expect(response.body).toHaveProperty('category', 'button');
      expect(response.body.createdBy).toHaveProperty('username', 'testuser');
    });

    test('should return 404 for non-existent component', async () => {
      const fakeId = '64a1b2c3d4e5f6789012345a';
      const response = await request(app)
        .get(`/api/components/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Component not found');
    });
  });

  describe('PUT /api/components/:id', () => {
    let testComponent;

    beforeEach(async () => {
      testComponent = new Component({
        name: 'Test Component',
        description: 'A test component',
        category: 'button',
        status: 'draft',
        createdBy: testUser._id
      });
      await testComponent.save();
    });

    test('should update own component', async () => {
      const updateData = {
        name: 'Updated Component',
        description: 'Updated description',
        status: 'review'
      };

      const response = await request(app)
        .put(`/api/components/${testComponent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Updated Component');
      expect(response.body).toHaveProperty('description', 'Updated description');
      expect(response.body).toHaveProperty('status', 'review');
    });

    test('should allow admin to update any component', async () => {
      const updateData = {
        name: 'Admin Updated Component',
        status: 'approved'
      };

      const response = await request(app)
        .put(`/api/components/${testComponent._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Admin Updated Component');
      expect(response.body).toHaveProperty('status', 'approved');
    });

    test('should allow designer to submit for review', async () => {
      const updateData = {
        status: 'review'
      };

      const response = await request(app)
        .put(`/api/components/${testComponent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'review');
    });

    test('should not allow non-admin to approve components', async () => {
      const updateData = {
        status: 'approved'
      };

      const response = await request(app)
        .put(`/api/components/${testComponent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Only admins can approve components');
    });

    test('should not allow updating other users components', async () => {
      // Create another user
      const otherUser = new User({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'hashedpassword',
        role: 'designer'
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { id: otherUser._id, username: otherUser.username, role: otherUser.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/components/${testComponent._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Permission denied');
    });
  });

  describe('DELETE /api/components/:id', () => {
    let testComponent;

    beforeEach(async () => {
      testComponent = new Component({
        name: 'Test Component',
        description: 'A test component',
        category: 'button',
        status: 'draft',
        createdBy: testUser._id
      });
      await testComponent.save();
    });

    test('should allow admin to delete any component', async () => {
      const response = await request(app)
        .delete(`/api/components/${testComponent._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Component deleted successfully');

      // Verify component was deleted
      const deletedComponent = await Component.findById(testComponent._id);
      expect(deletedComponent).toBeNull();
    });

    test('should not allow non-admin to delete components', async () => {
      const response = await request(app)
        .delete(`/api/components/${testComponent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });

    test('should return 404 for non-existent component', async () => {
      const fakeId = '64a1b2c3d4e5f6789012345a';
      const response = await request(app)
        .delete(`/api/components/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Component not found');
    });
  });

  describe('Component Status Workflow', () => {
    let draftComponent;

    beforeEach(async () => {
      draftComponent = new Component({
        name: 'Workflow Test Component',
        description: 'Testing status workflow',
        category: 'button',
        status: 'draft',
        createdBy: testUser._id
      });
      await draftComponent.save();
    });

    test('should follow draft -> review -> approved workflow', async () => {
      // Draft to Review (designer can do this)
      let response = await request(app)
        .put(`/api/components/${draftComponent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'review' })
        .expect(200);

      expect(response.body.status).toBe('review');

      // Review to Approved (only admin can do this)
      response = await request(app)
        .put(`/api/components/${draftComponent._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body.status).toBe('approved');
    });

    test('should allow admin to directly approve from draft', async () => {
      const response = await request(app)
        .put(`/api/components/${draftComponent._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body.status).toBe('approved');
    });
  });
});