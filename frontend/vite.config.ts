import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // sql.js ships a WASM binary — mark it as external so Vite doesn't try to bundle it
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  server: {
    headers: {
      // A05 Security Misconfiguration — enforce strict CSP and framing controls during dev.
      // In production these headers should be set at the web server / CDN level.
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://localhost:8080; frame-ancestors 'none';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
});
