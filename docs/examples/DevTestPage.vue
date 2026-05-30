<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWindows } from 'vue3-windows'

import PlaygroundWindowContent from './PlaygroundWindowContent.vue'

const windows = useWindows({
  width: 720,
  height: 480,
  outsideClickBehavior: 'minimize',
})
const titlePrefix = ref('测试窗口')
const seedNote = ref('用于验证手动交互和状态切换。')
const windowSummaries = computed(() => windows.windows.value)

let nextWindowId = 1

function createWindow() {
  const index = nextWindowId++
  windows.create({
    title: `${titlePrefix.value} ${index}`,
    component: PlaygroundWindowContent,
    note: seedNote.value,
  })
}

function createFixedWindow() {
  windows.create({
    id: 'dev-fixed-window',
    title: `${titlePrefix.value} 固定`,
    component: PlaygroundWindowContent,
    note: seedNote.value,
  })
}

function minimizeAll() {
  for (const windowRecord of windows.windows.value) {
    windows.minimize(windowRecord.id)
  }
}

function restoreAll() {
  for (const windowRecord of windows.windows.value) {
    windows.setState(windowRecord.id, 'normal')
  }
}
</script>

<template>
  <section class="dev-test-page">
    <header class="dev-test-page__header">
      <div>
        <p class="dev-test-page__eyebrow">Development only</p>
        <h1>文档测试页</h1>
        <p>用于手动验证窗口创建、状态切换和外部点击最小化。</p>
      </div>

      <div class="dev-test-page__actions">
        <button type="button" @click="createWindow">新建窗口</button>
        <button type="button" @click="createFixedWindow">固定 id 窗口</button>
        <button type="button" @click="minimizeAll">全部最小化</button>
        <button type="button" @click="restoreAll">全部还原</button>
        <button type="button" class="is-danger" @click="windows.closeAll()">全部关闭</button>
      </div>
    </header>

    <section class="dev-test-page__panel">
      <label>
        标题前缀
        <input v-model="titlePrefix" type="text" />
      </label>

      <label>
        初始备注
        <textarea v-model="seedNote" rows="4" />
      </label>
    </section>

    <section class="dev-test-page__panel">
      <h2>当前窗口</h2>

      <ul v-if="windowSummaries.length" class="dev-test-page__list">
        <li v-for="windowRecord in windowSummaries" :key="windowRecord.id">
          <span>{{ windowRecord.title }} · {{ windowRecord.state }}</span>
          <button type="button" @click="windows.moveTop(windowRecord.id)">置顶/恢复</button>
          <button type="button" @click="windows.minimize(windowRecord.id)">最小化</button>
          <button type="button" @click="windows.setState(windowRecord.id, 'maximized')">最大化</button>
          <button type="button" @click="windows.setState(windowRecord.id, 'normal')">还原</button>
          <button type="button" class="is-danger" @click="windows.close(windowRecord.id)">关闭</button>
        </li>
      </ul>

      <p v-else>还没有窗口。</p>
    </section>
  </section>
</template>

<style scoped>
.dev-test-page {
  display: grid;
  gap: 16px;
}

.dev-test-page__header,
.dev-test-page__panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: #fff;
}

.dev-test-page__header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.dev-test-page__eyebrow {
  margin: 0 0 4px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.dev-test-page h1,
.dev-test-page h2,
.dev-test-page p {
  margin: 0;
}

.dev-test-page__actions,
.dev-test-page__list li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dev-test-page__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dev-test-page__list li {
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
}

.dev-test-page label {
  display: grid;
  gap: 6px;
}

.dev-test-page input,
.dev-test-page textarea {
  box-sizing: border-box;
  width: 100%;
}

.dev-test-page button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.dev-test-page button.is-danger {
  border-color: #ef4444;
  color: #dc2626;
}

@media (max-width: 720px) {
  .dev-test-page__header {
    grid-template-columns: 1fr;
  }
}
</style>
