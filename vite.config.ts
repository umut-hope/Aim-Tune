import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves project sites at /<repo-name>/ (case-sensitive).
export default defineConfig({
  base: '/Aim-Tune/',
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
