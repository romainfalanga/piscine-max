import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages({ emptyOutDir: true })],
  build: {
    outDir: 'dist'
  }
})
