import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'JFS Partner Hub',
        short_name: 'JFS Hub',
        description: 'Jangid Furniture Studio — partner, referral and sales workspace with June AI.',
        theme_color: '#0f1d1c',
        background_color: '#0f1d1c',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 6 }
          },
          {
            urlPattern: /^https:\/\/api\.groq\.com\/.*$/,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: { host: '0.0.0.0', port: 5173 }
});
