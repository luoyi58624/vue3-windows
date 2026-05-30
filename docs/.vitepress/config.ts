import { defineConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'

const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig({
  title: 'vue3-windows',
  description: 'Vue 3 draggable window components',
  base: process.env.VITEPRESS_BASE || '/vue3-windows/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: 'Demo', link: '/demo/' },
      { text: '更新历史', link: '/changelog/' },
      ...(isDev ? [{ text: '测试页', link: '/dev/' }] : []),
    ],
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '介绍', link: '/guide/' },
          { text: 'API', link: '/api/' },
          { text: 'Demo', link: '/demo/' },
          { text: '更新历史', link: '/changelog/' },
          ...(isDev ? [{ text: '测试页', link: '/dev/' }] : []),
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/OWNER/vue3-windows' },
    ],
  },
  vite: {
    resolve: {
      alias: {
        'vue3-windows': fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
      },
    },
  },
})
