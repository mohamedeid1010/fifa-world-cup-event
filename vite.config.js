import { resolve } from 'node:path';
import { defineConfig } from 'vite';

function normalizeBasePath(value) {
  if (!value || value === '/') {
    return '/';
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function getBasePath() {
  if (process.env.VITE_BASE_PATH) {
    return normalizeBasePath(process.env.VITE_BASE_PATH);
  }

  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];

  if (process.env.GITHUB_ACTIONS === 'true' && repoName) {
    return normalizeBasePath(repoName);
  }

  return '/';
}

export default defineConfig({
  base: getBasePath(),
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
        miniGame: resolve(__dirname, 'src/pages/mini-game.html'),
        controlCenter: resolve(__dirname, 'src/pages/control-center.html'),
        policeControl: resolve(__dirname, 'src/pages/police.html'),
        medicalControl: resolve(__dirname, 'src/pages/active-dispatches.html'),
        restaurantControl: resolve(__dirname, 'src/pages/restaurant.html')
      }
    }
  }
});
