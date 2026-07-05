import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    base: env.VITE_APP_BASE_PATH || '/',
    plugins: [tailwindcss(), react()],
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:3001',
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  }
})
