import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
  server: {
    port: 22221,
    proxy: { '/api': 'http://localhost:11110' },
  },
});
