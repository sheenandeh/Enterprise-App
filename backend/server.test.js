const request = require('supertest');
const app = require('./server');

afterAll(() => {
  if (app.server) {
    app.server.close();
  }
});

describe('API Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('GET /version', () => {
    it('should return version info', async () => {
      const res = await request(app).get('/version');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('POST /api/register', () => {
    it('should require all fields', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ username: 'test' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('All fields are required');
    });
  });

  describe('POST /api/login', () => {
    it('should require email and password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ email: 'test@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Email and password are required');
    });
  });

  describe('GET /api/dashboard', () => {
    it('should return dashboard stats', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
    });
  });
});