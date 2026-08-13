import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");

          if (/\/node_modules\/react-router(?:-dom)?\//.test(normalizedId)) {
            return "router";
          }

          if (/\/node_modules\/(?:react|react-dom|scheduler)\//.test(normalizedId)) {
            return "react";
          }

          if (/\/node_modules\/axios\//.test(normalizedId)) {
            return "axios";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  
})
