import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
        background_color: '#000000',
        theme_color: '#000000',
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
      '/cap-proxy': {
        target:      'https://alerts.metservice.com',
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/cap-proxy/, ''),
      },
    },
  },
})
