import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Use jsdom environment for React DOM testing
    environment: 'jsdom',
    // Setup file for test environment configuration
    setupFiles: ['./src/__tests__/setup.ts'],
    // Include test files matching pattern
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
