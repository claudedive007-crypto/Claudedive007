import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In Docker Compose, BACKEND_URL points at the `backend` service name instead of localhost.
const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/v1': backendUrl,
      '/health': backendUrl,
    },
  },
})
