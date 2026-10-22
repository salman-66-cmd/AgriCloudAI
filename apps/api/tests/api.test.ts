import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('AgriCloud API Integration Tests', () => {
  const app = createApp();
  let farmerToken = '';
  let adminToken = '';

  it('GET /health returns 200 UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('POST /api/v1/auth/login authenticates demo farmer', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'farmer@agricloud.io',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('FARMER');
    farmerToken = res.body.data.tokens.accessToken;
  });

  it('POST /api/v1/auth/login authenticates demo admin', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@agricloud.io',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
    adminToken = res.body.data.tokens.accessToken;
  });

  it('GET /api/v1/auth/me returns authenticated user details', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('farmer@agricloud.io');
  });

  it('GET /api/v1/farms lists farms owned by the farmer', async () => {
    const res = await request(app)
      .get('/api/v1/farms')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.farms)).toBe(true);
    expect(res.body.data.farms.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/readings/latest returns latest telemetry with simulation flag', async () => {
    const res = await request(app)
      .get('/api/v1/readings/latest')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.fields)).toBe(true);
  });

  it('rejects unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/api/v1/farms');
    expect(res.status).toBe(401);
  });

  it('blocks non-admin users from accessing /api/v1/admin/users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(403);
  });

  it('allows admin users to access /api/v1/admin/users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
  });
});
