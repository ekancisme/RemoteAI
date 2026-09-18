import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app under https://<user>.github.io/RemoteAI/
  base: '/RemoteAI/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: true
  }
})
