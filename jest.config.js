module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/cloudfunctions'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  collectCoverageFrom: [
    'cloudfunctions/**/*.js',
    'miniprogram/utils/**/*.js',
    '!**/node_modules/**',
    '!**/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
