import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

// electron-vite 6 externalizes main/preload dependencies by default (`build.externalizeDeps`),
// replacing the deprecated externalizeDepsPlugin(). The preload imports only `electron`, which
// keeps it runnable with `sandbox: true`.
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
