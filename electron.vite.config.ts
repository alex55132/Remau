import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import path from 'path'

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
    plugins: [svelte()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src\\renderer'),
        '@types': path.resolve(__dirname, 'src\\types')
      }
    }
  }
})
