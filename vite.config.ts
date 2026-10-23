import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves project sites at /<repo-name>/ (case-sensitive).
export default defineConfig({
  base: '/Aim-Tune/',
  plugins: [svelte()],
  build: {
    // three.js lives in the lazily loaded test chunk (~545 kB); the first page stays small.
    chunkSizeWarningLimit: 600,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
