import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    maxWorkers: 1,
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      exclude: ["**/*.d.ts", "**/types/**", "test/**", "testing/**", "**/*.spec.ts"],
    },
  },
})
