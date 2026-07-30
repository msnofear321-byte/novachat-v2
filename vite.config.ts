import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const reactPath = resolve(__dirname, 'node_modules/react')
const reactDomPath = resolve(__dirname, 'node_modules/react-dom')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': `${__dirname}/src`,
      react: reactPath,
      'react-dom': reactDomPath,
      'react/jsx-runtime': resolve(reactPath, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': resolve(reactPath, 'jsx-dev-runtime.js'),
    },
  },
})
