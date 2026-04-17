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

  build: {
    // Inline every CSS chunk directly into the HTML <head>.
    // Eliminates render-blocking stylesheet requests AND cache-miss FOUC
    // on first visit. At ~10 KB gz the cost is trivial vs. the LCP win.
    inlineStylesheets: 'always',
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Smaller client bundles; modern browsers only (no legacy polyfill bloat in lab “Legacy JS” audit)
      target: 'es2022',
    },
  },
});