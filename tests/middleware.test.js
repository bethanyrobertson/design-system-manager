// tests/middleware.test.js - Middleware Tests
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create test app
const app = express();
app.use(express.json());

// Test routes
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Access granted', user: req.user });
});

app.get('/admin-only', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

app.get('/designer-dev', authenticateToken, requireRole(['designer', 'developer']), (req, res) => {
  res.json({ message: 'Designer or developer access granted' });
});

describe('Authentication Middleware', () => {
  describe('authenticateToken', () => {
    test('should allow access with valid token', async () => {
      const token = jwt.sign(
        { id: 'user123', username: 'testuser', role: 'designer' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Access granted');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).toHaveProperty('role', 'designer');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    test('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user123', username: 'testuser', role: 'designer' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    test('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should reject request with token signed with wrong secret', async () => {
      const wrongToken = jwt.sign(
        { id: 'user123', username: 'testuser', role: 'designer' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${wrongToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });
  });

  describe('requireRole', () => {
    test('should allow admin access to admin-only route', async () => {
      const adminToken = jwt.sign(
        { id: 'admin123', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Admin access granted');
    });

    test('should reject non-admin access to admin-only route', async () => {
      const designerToken = jwt.sign(
        { id: 'designer123', username: 'designer', role: 'designer' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });

    test('should allow designer access to designer-dev route', async () => {
      const designerToken = jwt.sign(
        { id: 'designer123', username: 'designer', role: 'designer' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/designer-dev')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Designer or developer access granted');
    });

    test('should allow developer access to designer-dev route', async () => {
      const developerToken = jwt.sign(
        { id: 'dev123', username: 'developer', role: 'developer' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/designer-dev')
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Designer or developer access granted');
    });

    test('should reject admin access to designer-dev route if admin not in allowed roles', async () => {
      const adminToken = jwt.sign(
        { id: 'admin123', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/designer-dev')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });

    test('should work with single role in array', async () => {
      // Create a route that only allows designers
      app.get('/designer-only', authenticateToken, requireRole(['designer']), (req, res) => {
        res.json({ message: 'Designer only access' });
      });

      const designerToken = jwt.sign(
        { id: 'designer123', username: 'designer', role: 'designer' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/designer-only')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Designer only access');
    });

    test('should handle case-sensitive role comparison', async () => {
      const upperCaseRoleToken = jwt.sign(
        { id: 'user123', username: 'user', role: 'ADMIN' }, // uppercase role
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${upperCaseRoleToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });
  });

  describe('Middleware Chain', () => {
    test('should execute middlewares in correct order', async () => {
      // This test ensures authenticateToken runs before requireRole
      const response = await request(app)
        .get('/admin-only')
        .expect(401); // Should fail at authenticateToken, not requireRole

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should pass user context between middlewares', async () => {
      const adminToken = jwt.sign(
        { id: 'admin123', username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Create a route that uses both middlewares and returns user info
      app.get('/user-info', authenticateToken, requireRole(['admin']), (req, res) => {
        res.json({ 
          message: 'User info',
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role
        });
      });

      const response = await request(app)
        .get('/user-info')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId', 'admin123');
      expect(response.body).toHaveProperty('username', 'admin');
      expect(response.body).toHaveProperty('role', 'admin');
    });
  });
});