import path from 'node:path'
import type { BuildOptions } from 'vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }
  const isProd = mode === 'production'

  const build: BuildOptions = {
    manifest: isProd,
    chunkSizeWarningLimit: 1024,
  }

  return {
    base: process.env.VITE_BASE_PATH,

    build,

    resolve: {
      // preserveSymlinks: true,
      alias: {
        '@/': `${path.resolve(__dirname, 'src')}/`,
      },
    },

    plugins: [],
  }
})
