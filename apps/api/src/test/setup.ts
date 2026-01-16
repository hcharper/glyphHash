// Jest setup file
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/glyphhash_test';
process.env.HEDERA_NETWORK = 'testnet';
process.env.HEDERA_ACCOUNT_ID = '0.0.12345';
process.env.HEDERA_PRIVATE_KEY = '302e020100300506032b657004220420';

// Global test timeout
jest.setTimeout(10000);

// Mock console.error to keep test output clean
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress expected errors in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Test error') || args[0].includes('expected'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
