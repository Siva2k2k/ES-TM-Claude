import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
/// <reference types="vitest" />

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@layouts': resolve(__dirname, './src/layouts'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@services': resolve(__dirname, './src/services'),
      '@store': resolve(__dirname, './src/store'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@lib': resolve(__dirname, './src/lib'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: ['es2015', 'firefox60'], // Better Firefox compatibility
  },
  server: {
    // Add headers for better Firefox compatibility
    headers: {
      'Cache-Control': 'no-cache',
    },
  },
  // @ts-expect-error - Vitest config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './jest-setup.ts',
    // Optimize for memory usage
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Prevent parallel execution causing memory issues
      },
    },
    // Increase test timeout to handle slower memory operations
    testTimeout: 30000,
    // Force garbage collection between tests
    sequence: {
      hooks: 'stack',
    },
    // Exclude E2E tests from Vitest (they should be run with Playwright)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.e2e.*',
      '**/__tests__/e2e/**',
    ],
  },
});
