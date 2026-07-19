/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  moduleNameMapper: {
    "^@aurumtrace/shared$": "<rootDir>/../../../packages/shared/src",
    "^@aurumtrace/integrations$": "<rootDir>/../../../packages/integrations/src",
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: { experimentalDecorators: true, emitDecoratorMetadata: true } }],
  },
};
