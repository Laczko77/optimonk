import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Vite + Vitest config. funnel.js is pure (no Vue/DOM), so the test
// environment is 'node'. jsdom/@vue/test-utils are intentionally not added
// yet — they arrive with the component-testing iterations.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.js'],
    passWithNoTests: true,
  },
})
