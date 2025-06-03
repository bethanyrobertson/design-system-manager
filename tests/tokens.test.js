const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const tokenRoutes = require('../routes/tokens');
const DesignToken = require('../models/DesignToken');
const User = require('../models/User');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tokens', tokenRoutes);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Design Token Routes', () => {
  let testUser;
  let authToken;
  let adminUser;
  let adminToken;

  beforeEach(async () => {
    // test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'designer'
    });
    await testUser.save();

    // admin user
    adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'hashedpassword',
      role: 'admin'
    });
    await adminUser.save();

    // auth tokens
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

  describe('POST /api/tokens', () => {
    test('should create a new design token as admin', async () => {
      const tokenData = {
        name: 'primary-blue',
        category: 'color',
        value: '#3B82F6',
        description: 'Primary brand color',
        tags: ['primary', 'brand']
      };

      const response = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tokenData)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'primary-blue');
      expect(response.body).toHaveProperty('category', 'color');
      expect(response.body).toHaveProperty('value', '#3B82F6');
      expect(response.body).toHaveProperty('description', 'Primary brand color');
      expect(response.body.tags).toEqual(['primary', 'brand']);
      expect(response.body.createdBy).toHaveProperty('username', 'admin');

      // Verify token was created in database
      const token = await DesignToken.findOne({ name: 'primary-blue' });
      expect(token).toBeTruthy();
    });

    test('should not create token without required fields', async () => {
      const tokenData = {
        name: 'incomplete-token'
        // missing category and value
      };

      const response = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tokenData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name, category, and value are required');
    });

    test('should not create token without admin role', async () => {
      const tokenData = {
        name: 'primary-blue',
        category: 'color',
        value: '#3B82F6'
      };

      const response = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });

    test('should create token with empty tags array if not provided', async () => {
      const tokenData = {
        name: 'simple-token',
        category: 'color',
        value: '#FF0000'
      };

      const response = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tokenData)
        .expect(201);

      expect(response.body.tags).toEqual([]);
    });
  });

  describe('GET /api/tokens', () => {
    beforeEach(async () => {
      // Create test tokens
      const tokens = [
        {
          name: 'primary-blue',
          category: 'color',
          value: '#3B82F6',
          description: 'Primary color',
          tags: ['primary'],
          createdBy: testUser._id
        },
        {
          name: 'secondary-green',
          category: 'color',
          value: '#10B981',
          description: 'Secondary color',
          tags: ['secondary'],
          createdBy: testUser._id
        },
        {
          name: 'heading-font',
          category: 'typography',
          value: 'Inter, sans-serif',
          description: 'Heading font family',
          tags: ['typography', 'font'],
          createdBy: testUser._id
        }
      ];

      await DesignToken.insertMany(tokens);
    });

    test('should get all tokens', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.tokens).toHaveLength(3);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total', 3);
    });

    test('should filter tokens by category', async () => {
      const response = await request(app)
        .get('/api/tokens?category=color')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.tokens).toHaveLength(2);
      response.body.tokens.forEach(token => {
        expect(token.category).toBe('color');
      });
    });

    test('should search tokens by text', async () => {
      const response = await request(app)
        .get('/api/tokens?search=primary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.tokens).toHaveLength(1);
      expect(response.body.tokens[0].name).toBe('primary-blue');
    });

    test('should paginate tokens', async () => {
      const response = await request(app)
        .get('/api/tokens?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.tokens).toHaveLength(2);
      expect(response.body.pagination.current).toBe(1);
      expect(response.body.pagination.pages).toBe(2);
    });

    test('should not get tokens without authentication', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /api/tokens/:id', () => {
    let testToken;

    beforeEach(async () => {
      testToken = new DesignToken({
        name: 'test-token',
        category: 'color',
        value: '#FF0000',
        description: 'Test token',
        createdBy: testUser._id
      });
      await testToken.save();
    });

    test('should get token by id', async () => {
      const response = await request(app)
        .get(`/api/tokens/${testToken._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'test-token');
      expect(response.body).toHaveProperty('category', 'color');
      expect(response.body.createdBy).toHaveProperty('username', 'testuser');
    });

    test('should return 404 for non-existent token', async () => {
      const fakeId = '64a1b2c3d4e5f6789012345a';
      const response = await request(app)
        .get(`/api/tokens/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Design token not found');
    });
  });

  describe('PUT /api/tokens/:id', () => {
    let testToken;

    beforeEach(async () => {
      testToken = new DesignToken({
        name: 'test-token',
        category: 'color',
        value: '#FF0000',
        description: 'Test token',
        createdBy: testUser._id
      });
      await testToken.save();
    });

    test('should update own token', async () => {
      const updateData = {
        name: 'updated-token',
        value: '#00FF00',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/tokens/${testToken._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'updated-token');
      expect(response.body).toHaveProperty('value', '#00FF00');
      expect(response.body).toHaveProperty('description', 'Updated description');
    });

    test('should allow admin to update any token', async () => {
      const updateData = {
        name: 'admin-updated-token'
      };

      const response = await request(app)
        .put(`/api/tokens/${testToken._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'admin-updated-token');
    });

    test('should not allow updating other users tokens', async () => {
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
        name: 'unauthorized-update'
      };

      const response = await request(app)
        .put(`/api/tokens/${testToken._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Permission denied');
    });
  });

  describe('DELETE /api/tokens/:id', () => {
    let testToken;

    beforeEach(async () => {
      // Create a test token
      testToken = new DesignToken({
        name: 'test-token',
        category: 'color',
        value: '#FF0000',
        description: 'Test token',
        createdBy: testUser._id
      });
      await testToken.save();
    });

    test('should allow admin to delete any token', async () => {
      const response = await request(app)
        .delete(`/api/tokens/${testToken._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Design token deleted successfully');

      // token was deleted from database
      const deletedToken = await DesignToken.findById(testToken._id);
      expect(deletedToken).toBeNull();
    });

    test('should not allow non-admin to delete token', async () => {
      const response = await request(app)
        .delete(`/api/tokens/${testToken._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');

      //token still exists in database
      const existingToken = await DesignToken.findById(testToken._id);
      expect(existingToken).toBeTruthy();
    });

    test('should return 404 for non-existent token', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; 
      const response = await request(app)
        .delete(`/api/tokens/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Design token not found');
    });

    test('should return 400 for invalid token ID format', async () => {
      const response = await request(app)
        .delete('/api/tokens/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid token ID format');
    });

    test('should require authentication to delete token', async () => {
      const response = await request(app)
        .delete(`/api/tokens/${testToken._id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });
});