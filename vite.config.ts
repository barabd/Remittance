import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Baseline headers for dev/preview; mirror in production reverse proxy (see docs/deploy/). */
const securityHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'frms-mock-health',
        configureServer(server) {
          server.middlewares.use('/api/health', (_req, res) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, service: 'admin-dashboard-dev' }))
          })
        },
      },
    ],
    server: {
      headers: securityHeaders,
      proxy: {
        // Browser same-origin /api/v1 → Spring Boot (see docs/STACK_INTEGRATION.md, server.servlet.context-path).
        '/api/v1': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000',
          changeOrigin: true,
          headers: {
            Origin: 'http://localhost:5173'
          }
        },
      },
    },
    preview: {
      headers: securityHeaders,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('@mui/') ||
                id.includes('@emotion/')
              ) {
                return 'mui'
              }
              if (
                id.includes('react') ||
                id.includes('scheduler')
              ) {
                return 'react'
              }
              return 'vendor'
            }
            return undefined
          },
        },
      },
    },
  }
})
