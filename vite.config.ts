import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ling-dashboard/',
  server: {
    port: 3000,
    host: true
  }
})
