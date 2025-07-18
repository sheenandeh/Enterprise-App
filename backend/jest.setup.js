// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_USER = 'test';
process.env.POSTGRES_PASSWORD = 'test';
process.env.POSTGRES_DB = 'test';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn().mockImplementation((query) => {
      if (query.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '0' }] });
      }
      return Promise.resolve({ rows: [] });
    }),
    end: jest.fn()
  }))
}));