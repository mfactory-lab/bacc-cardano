import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: true,
  format: ['cjs', 'esm'],
  legacyOutput: true,
  cjsInterop: true,
  minify: true,
  treeshake: true,
  shims: true,
  // external: ['@nestjs/core', '@prisma/client', '@nestjs/common'],
  dts: true,
})
