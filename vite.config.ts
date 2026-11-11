import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Кабинет ветеринара работает с тем же сервером (API), что и сайт для клиентов (VETWEB, порт 3001)
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
    proxy: {
      '/api': { target: process.env.VETDOM_API || 'http://localhost:3001', changeOrigin: true },
    },
  },
});
