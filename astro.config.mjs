import { defineConfig } from 'astro/config';

// Endereço oficial do site (usado nas prévias de link e no endereço canônico).
// Publicado na Cloudflare (Worker com arquivos estáticos, veja wrangler.jsonc).
export default defineConfig({
  site: 'https://beatrizchiusi.com.br',
});
