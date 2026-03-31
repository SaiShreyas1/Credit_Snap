import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // We just add this test block right below your plugins!
  test: {
    environment: 'jsdom',
    globals: true,
  }
})