import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src\\main'),
        '@types': path.resolve(__dirname, 'src\\types')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src\\preload'),
        '@types': path.resolve(__dirname, 'src\\types')
      }
    }
  },
  renderer: {
    plugins: [
      svelte(),
      nodePolyfills({
        // Polyfill Node.js globals and modules
        globals: {
          Buffer: true,
          global: true,
          process: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src\\renderer'),
        '@types': path.resolve(__dirname, 'src\\types')
      }
    },
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      include: ['simple-peer']
    }
  }
})
