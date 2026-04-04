export default {
  testEnvironment: "node",
  injectGlobals: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.js", "!src/test/**", "!**/node_modules/**"],
  coverageReporters: ["text", "json", "lcov", "html"],
  testTimeout: 10000,
};
