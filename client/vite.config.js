import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Settings live in the repo-root .env (Docker passes them in as environment variables instead)
  envDir: '..',
  server: {
    // In Docker on Windows, file-change events from bind mounts don't reach the container, so poll instead
    watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
  },
})
