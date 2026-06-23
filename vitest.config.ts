import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Prevent parallel execution of tests to avoid conflicts in shared resources (e.g., database, file system).
    maxWorkers: 1,
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      exclude: ["**/*.d.ts", "**/types/**", "test/**", "testing/**", "**/*.spec.ts"],
    },
  },
})
