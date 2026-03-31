#!/usr/bin/env node
/**
 * Start both the mock API server and Vite dev server
 * Usage: npm run dev:full
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('🚀 Starting FRMS Admin Dashboard (Full Stack Mode)\n')

// Start mock API server
const mockApi = spawn('node', [path.join(__dirname, 'server', 'mock-api.mjs')], {
  stdio: 'inherit',
  shell: true,
})

mockApi.on('error', (err) => {
  console.error('❌ Failed to start mock API:', err)
  process.exit(1)
})

// Wait a bit for the API to start before starting Vite
setTimeout(() => {
  console.log('\n⏳ Starting Vite dev server...\n')

  // Start Vite dev server
  const vite = spawn('npm', ['run', 'dev:vite'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname,
  })

  vite.on('error', (err) => {
    console.error('❌ Failed to start Vite:', err)
    process.exit(1)
  })

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...')
    mockApi.kill()
    vite.kill()
    process.exit(0)
  })
}, 2000)
