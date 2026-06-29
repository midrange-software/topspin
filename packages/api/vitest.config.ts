import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  resolve: {
    alias: {
      '@topspin/db': fileURLToPath(new URL('../db/src/index.ts', import.meta.url)),
      '@topspin/db/schema': fileURLToPath(new URL('../db/src/schema/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
    },
  },
})
