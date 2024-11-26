module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/"
  ],
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
}
