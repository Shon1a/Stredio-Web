import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy: /api/* → the live backend, server-side, so the browser makes a
    // same-origin request and CORS never applies. Lets `npm run dev` show real
    // catalog data without running the Express server locally. In production the
    // app talks to the backend directly (see src/lib/api.ts API_BASE).
    proxy: {
      '/api': {
        target: 'https://stredio.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
