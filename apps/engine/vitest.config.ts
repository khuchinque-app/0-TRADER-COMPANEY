/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@trading\/shared$/, replacement: path.resolve(__dirname, '../../packages/shared/dist') },
    ],
  },
  test: {
    globals: true,
    testTimeout: 15000,
  },
});
