import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Serve favicon at /funk-brokers/vite.svg in dev (public/ is at /, prod has dist/vite.svg at base)
    {
      name: 'favicon-at-base',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const p = req.url?.split('?')[0]
          if (p === '/funk-brokers/vite.svg') {
            try {
              const file = path.join(__dirname, 'public', 'vite.svg')
              const content = fs.readFileSync(file)
              res.setHeader('Content-Type', 'image/svg+xml')
              res.end(content)
            } catch {
              next()
            }
            return
          }
          next()
        })
      },
    },
  ],
  base: '/funk-brokers/', // GitHub Pages base path
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
