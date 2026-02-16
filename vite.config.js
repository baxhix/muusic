import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/health': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/admin': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          mapbox: ['mapbox-gl'],
          icons: ['lucide-react']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  }
});
