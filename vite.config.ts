import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import generouted from '@generouted/react-router/plugin'
import { cloudflare } from '@cloudflare/vite-plugin'
import { deepspaceBuild } from 'deepspace/build'

const appDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), generouted(), cloudflare(), deepspaceBuild({ appDir })],
  resolve: {
    dedupe: ['react', 'react-dom', 'better-auth'],
  },
})
