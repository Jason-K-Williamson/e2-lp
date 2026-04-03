// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://lp.e2.agency',
  output: 'server',
  adapter: cloudflare(),
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Smaller client bundles; modern browsers only (no legacy polyfill bloat in lab “Legacy JS” audit)
      target: 'es2022',
    },
  },
});