// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: "server",
  server: {
    host: "0.0.0.0",
    port: 10000
  },
  adapter: node({
    mode: "standalone"
  }),
});