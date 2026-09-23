import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base matches the GitHub Pages project site: https://dineshshakya.github.io/npa-booking/
export default defineConfig({
  plugins: [react()],
  base: '/npa-booking/',
});
