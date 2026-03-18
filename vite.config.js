import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/ClaudeWeather/',
  server: {
    proxy: {
      '/wu-proxy': {
        target:      'https://api.weather.com',
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/wu-proxy/, ''),
      },
    },
  },
})
