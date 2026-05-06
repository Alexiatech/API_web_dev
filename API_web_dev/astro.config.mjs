// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Astro config voor server-rendered app (output: "server").
// We gebruiken de Node adapter in standalone mode zodat Render een
// gewone "node ./dist/server/entry.mjs" kan draaien.
//
// security.checkOrigin: false
// ------------------------------
// Astro 5 zet standaard een CSRF check aan die elke POST blokkeert als
// de Origin header niet matcht met de Host. Op Render zit een proxy
// voor onze app, waardoor Origin (browser) en Host (proxy intern) niet
// gelijk zijn -> elke POST krijgt 403 "Cross-site POST forbidden".
// We zetten 'm uit; onze /api/identify endpoint gebruikt geen cookies
// of sessies, dus CSRF is hier niet relevant.
// Bron: https://docs.astro.build/en/reference/configuration-reference/#securitycheckorigin

export default defineConfig({
  output: "server",
  server: {
    host: "0.0.0.0",
    port: 10000
  },
  adapter: node({
    mode: "standalone"
  }),
  security: {
    checkOrigin: false,
  },
});