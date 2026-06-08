import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Vite + Vitest config. The default test environment is 'node' because the
// funnel.js math is pure (no Vue/DOM). Component tests that need a DOM opt in
// per file with a `// @vitest-environment jsdom` docblock (jsdom + @vue/test-utils
// are installed for this), so tests/funnel.test.js keeps running under node.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // Dev-server proxy: forward the frontend's /api requests to the Express
  // backend (server/index.js) on port 3001, so the app can fetch /api/campaigns
  // same-origin without CORS during development.
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.js'],
    passWithNoTests: true,
  },
})
