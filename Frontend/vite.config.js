import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,   // Listen on 0.0.0.0 so the server IP works (not just localhost)
    port: 5175,   // Always use this port — prevents Vite randomly picking 5176, 5177, etc.
    strictPort: true, // Crash instead of silently switching ports (so you notice if 5175 is taken)
  },
  test: {
    environment: 'jsdom',
    globals: true,
  }
})