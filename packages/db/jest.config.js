/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test",
  testRegex: ".*\\.spec\\.ts$",
  moduleNameMapper: {
    "^@aurumtrace/shared$": "<rootDir>/../../shared/src",
  },
  // PGlite spins up a WASM Postgres per suite; give it room.
  testTimeout: 30000,
};
