import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // sql.js ships a WASM binary — include it in optimizeDeps for proper module resolution
  optimizeDeps: {
    include: ['sql.js'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    headers: {
      // A05 Security Misconfiguration — enforce CSP and framing controls during dev.
      // Note: During development, 'unsafe-inline' and 'unsafe-eval' are needed for Vite HMR and sql.js WASM.
      // In production, these should be removed or replaced with nonces/hashes at the web server / CDN level.
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://localhost:8080 ws://localhost:5173; frame-ancestors 'none';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
});
