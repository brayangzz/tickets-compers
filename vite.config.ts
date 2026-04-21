import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('react-router-dom') ||
            id.includes('react-dom') ||
            id.includes('node_modules/react/')
          ) {
            return 'vendor-react'
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion'
          }

          if (
            id.includes('xlsx') ||
            id.includes('xlsx-js-style')
          ) {
            return 'vendor-xlsx'
          }

          if (
            id.includes('html2canvas') ||
            id.includes('canvg') ||
            id.includes('dompurify')
          ) {
            return 'vendor-pdf-html'
          }

          if (
            id.includes('jspdf') ||
            id.includes('jspdf-autotable')
          ) {
            return 'vendor-pdf'
          }

        },
      },
    },
  },
})
