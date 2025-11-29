// Jest setup file for blockchain tests

// Increase timeout for mining operations
jest.setTimeout(30000);

// Mock console methods to reduce test output noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test utilities
(global as any).testUtils = {
  // Helper to create test addresses
  generateTestAddress: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '1';
    for (let i = 0; i < 33; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate test data
  generateTestData: (size: number) => {
    return Array.from({ length: size }, (_, i) => `test-data-${i}`);
  }
};

// Extend Jest matchers
expect.extend({
  toBeValidHash(received: string) {
    const pass = typeof received === 'string' && 
                 received.length === 64 && 
                 /^[a-f0-9]+$/i.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid hash`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid hash`,
        pass: false,
      };
    }
  },
  
  toBeValidAddress(received: string) {
    const pass = typeof received === 'string' && 
                 received.length === 41 && 
                 received.startsWith('1');
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid address`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid address`,
        pass: false,
      };
    }
  }
});
