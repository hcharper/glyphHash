/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 65,
      lines: 75,
      statements: 75
    }
  },
  moduleNameMapper: {
    '^@glyphhash/types$': '<rootDir>/../../packages/types/src',
    '^@glyphhash/hedera$': '<rootDir>/../../packages/hedera/src',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};
