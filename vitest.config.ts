import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/shared/**/*.ts",
        "src/application/engine/ruleEngine.ts",
        "src/infra/http/middlewares/admin.ts",
        "src/infra/http/middlewares/errorHandler.ts"
      ],
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 98,
        statements: 98
      }
    }
  }
});
