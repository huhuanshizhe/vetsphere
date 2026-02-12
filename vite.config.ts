
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Expose to network
    port: 3000,
    allowedHosts: [
      'veterinary.chanyechuhai.com',
      'vetsphere.com',
      'www.vetsphere.com',
      'vetsphere.net',
      'www.vetsphere.net',
      'localhost',
      '127.0.0.1'
    ]
  }
});
