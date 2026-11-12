import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { buildCommit } from './buildInfo.mjs'

// In production Looper sets LOOPER_BACKEND_URL for the api runner; BACKEND_URL is the manual override.
const backend = process.env.LOOPER_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:3101'
const port = Number(process.env.PORT ?? 5173)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_COMMIT__: JSON.stringify(buildCommit()), __APP_STARTED_AT__: JSON.stringify(new Date().toISOString()) },
  server: {
    host: true,
    port,
    allowedHosts: true,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/t/': { target: backend, changeOrigin: true },
      '/ws': { target: backend, ws: true, changeOrigin: true },
    },
  },
})
