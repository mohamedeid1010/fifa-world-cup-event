import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demoPage: resolve(__dirname, 'src/pages/demo.html'),
        userPortal: resolve(__dirname, 'src/pages/user-portal.html'),
        teams: resolve(__dirname, 'src/pages/teams.html'),
        controlCenter: resolve(__dirname, 'src/pages/control-center.html'),
        policeControl: resolve(__dirname, 'src/pages/police.html'),
        medicalControl: resolve(__dirname, 'src/pages/active-dispatches.html'),
        restaurantControl: resolve(__dirname, 'src/pages/restaurant.html')
      }
    }
  }
});
