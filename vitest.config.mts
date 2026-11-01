import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("."),
      "server-only": path("tests/unit/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
