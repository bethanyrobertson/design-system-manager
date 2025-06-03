const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Auth Middleware', () => {
  let app;
  let testToken;
  let adminToken;
  let designerToken;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // tokens
    testToken = jwt.sign(
      { id: '123', username: 'testuser', role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    adminToken = jwt.sign(
      { id: '456', username: 'admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    designerToken = jwt.sign(
      { id: '789', username: 'designer', role: 'designer' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  describe('authenticateToken', () => {
    test('should authenticate valid token', async () => {
      app.get('/test', authenticateToken, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).toHaveProperty('role', 'user');
    });

    test('should reject invalid token', async () => {
      app.get('/test', authenticateToken, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    test('should reject request without token', async () => {
      app.get('/test', authenticateToken, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('requireRole', () => {
    test('should allow admin access to admin-only route', async () => {
      app.get('/admin', authenticateToken, requireRole(['admin']), (req, res) => {
        res.json({ message: 'Admin access granted' });
      });

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Admin access granted');
    });

    test('should deny non-admin access to admin-only route', async () => {
      app.get('/admin', authenticateToken, requireRole(['admin']), (req, res) => {
        res.json({ message: 'Admin access granted' });
      });

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });

    test('should allow access to route with multiple allowed roles', async () => {
      app.get('/design', authenticateToken, requireRole(['admin', 'designer']), (req, res) => {
        res.json({ message: 'Access granted' });
      });

      // admin access
      const adminResponse = await request(app)
        .get('/design')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminResponse.body).toHaveProperty('message', 'Access granted');

      // designer access
      const designerResponse = await request(app)
        .get('/design')
        .set('Authorization', `Bearer ${designerToken}`)
        .expect(200);

      expect(designerResponse.body).toHaveProperty('message', 'Access granted');
    });

    test('should deny access to route with multiple allowed roles for unauthorized role', async () => {
      app.get('/design', authenticateToken, requireRole(['admin', 'designer']), (req, res) => {
        res.json({ message: 'Access granted' });
      });

      const response = await request(app)
        .get('/design')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });
  });
});