import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { bridgeInlineEvents } from './scripts/inline-event-bridge.mjs';

const prototypeEntry = fileURLToPath(new URL('./src/prototype.js', import.meta.url));

export default defineConfig({
  // Safe for https://site.example/ and https://site.example/prototype/.
  base: './',
  appType: 'spa',
  plugins: [{
    name: 'preserve-prototype-inline-events',
    enforce: 'pre',
    transform(source, id) {
      if (id.split('?')[0] !== prototypeEntry) return null;
      return { code: bridgeInlineEvents(source), map: null };
    },
  }],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
  },
});
