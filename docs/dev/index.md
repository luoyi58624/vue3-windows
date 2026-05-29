---
layout: page
sidebar: false
aside: false
title: 测试页
---

<ClientOnly>
  <DevTestPage v-if="isDev" />
</ClientOnly>

<div v-if="!isDev" class="vp-doc">
  <h1>不可用</h1>
  <p>该页面仅在开发环境下可见。</p>
</div>

<script setup lang="ts">
import DevTestPage from '../examples/DevTestPage.vue'

const isDev = import.meta.env.DEV
</script>
