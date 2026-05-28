import { resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    command === 'build'
      ? dts({
          tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
          entryRoot: 'src',
          include: ['src/lib/**/*.ts', 'src/lib/**/*.vue', 'src/index.ts'],
          exclude: ['src/demo/**'],
        })
      : undefined,
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Vue3Windows',
      fileName: 'vue3-windows',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
}))
