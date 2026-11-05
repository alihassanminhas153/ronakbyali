import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'RONAK_BY_ALI_'],
  plugins: [
    react(),
    tailwindcss()
  ],
})
