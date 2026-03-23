import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: '/ClaudeWeather/index.html',
      },
      manifest: {
        name: 'ClaudeWeather',
        short_name: 'ClaudeWeather',
        start_url: '/ClaudeWeather/',
        display: 'standalone',
        background_color: '#0b1120',
        theme_color: '#1e3a5f',
        icons: [
          {
            src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛅</text></svg>",
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  base: '/ClaudeWeather/',
  server: {
    proxy: {
      '/wu-proxy': {
        target:      'https://api.weather.com',
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/wu-proxy/, ''),
      },
      '/tempest-proxy': {
        target:      'https://swd.weatherflow.com',
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/tempest-proxy/, ''),
      },
    },
  },
})
