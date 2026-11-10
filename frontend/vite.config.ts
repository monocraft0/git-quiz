/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages（https://<user>.github.io/git-quiz/）ではサブパスで配信されるため、
// ワークフローが BASE_PATH=/git-quiz/ を渡す。ローカルでは / のまま。
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
