import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-web-mode',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `<meta name="pilipaladown-mode" content="web">
<script>window.__PILIPALADOWN_SERVER_URL = window.location.origin</script>
</head>`
        )
      },
    },
  ],
  base: '',
  build: {
    outDir: 'dist-web',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8098',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
