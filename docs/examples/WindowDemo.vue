<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AccentType, WindowOutsideClickBehavior } from 'vue3-windows'
import { useWindows } from 'vue3-windows'

import PlaygroundWindowContent from './PlaygroundWindowContent.vue'

type WindowPreset = 'compact' | 'default' | 'wide'

const titlePrefix = ref('示例窗口')
const seedNote = ref('最小 API 示例窗口。')
const outsideClickBehavior = ref<WindowOutsideClickBehavior>('minimize')
const accentType = ref<AccentType>('primary')
const windows = useWindows({
  width: 720,
  height: 480,
})
const windowSummaries = computed(() => windows.windows.value)

let nextWindowId = 1

function createWindow(preset: WindowPreset) {
  const index = nextWindowId++
  const dimensions = getDimensions(preset)

  windows.create({
    title: `${titlePrefix.value} ${index}`,
    component: PlaygroundWindowContent,
    width: dimensions.width,
    height: dimensions.height,
    outsideClickBehavior: outsideClickBehavior.value,
    accentType: accentType.value,
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

function getDimensions(preset: WindowPreset) {
  if (preset === 'compact') {
    return { width: 560, height: 380 }
  }

  if (preset === 'wide') {
    return { width: 920, height: 560 }
  }

  return { width: 720, height: 480 }
}
</script>

<template>
  <section class="window-demo">
    <header class="window-demo__hero">
      <div>
        <p class="window-demo__eyebrow">vue3-windows</p>
        <h1>轻量窗口管理</h1>
        <p>通过 `useWindows()` 创建窗口，通过三种状态控制显示、最小化和最大化。</p>
      </div>

      <div class="window-demo__hero-actions">
        <button type="button" @click="createWindow('compact')">紧凑窗口</button>
        <button type="button" @click="createWindow('default')">默认窗口</button>
        <button type="button" @click="createWindow('wide')">宽窗口</button>
      </div>
    </header>

    <div class="window-demo__layout">
      <section class="window-demo__panel">
        <h2>创建参数</h2>

        <label>
          标题前缀
          <input v-model="titlePrefix" type="text" />
        </label>

        <label>
          初始备注
          <textarea v-model="seedNote" rows="4" />
        </label>

        <label>
          外部点击
          <select v-model="outsideClickBehavior">
            <option value="none">none</option>
            <option value="minimize">minimize</option>
            <option value="remove">remove</option>
          </select>
        </label>

        <label>
          强调色
          <select v-model="accentType">
            <option value="primary">primary</option>
            <option value="success">success</option>
            <option value="warning">warning</option>
            <option value="danger">danger</option>
            <option value="info">info</option>
          </select>
        </label>

        <div class="window-demo__actions">
          <button type="button" @click="minimizeAll">全部最小化</button>
          <button type="button" @click="restoreAll">全部还原</button>
          <button type="button" class="is-danger" @click="windows.closeAll()">全部关闭</button>
        </div>
      </section>

      <section class="window-demo__panel">
        <h2>当前窗口</h2>

        <ul v-if="windowSummaries.length" class="window-demo__list">
          <li v-for="windowRecord in windowSummaries" :key="windowRecord.id">
            <strong>{{ windowRecord.title }}</strong>
            <span>{{ windowRecord.state }}</span>

            <div>
              <button type="button" @click="windows.moveTop(windowRecord.id)">置顶/恢复</button>
              <button type="button" @click="windows.minimize(windowRecord.id)">最小化</button>
              <button type="button" @click="windows.setState(windowRecord.id, 'maximized')">最大化</button>
              <button type="button" @click="windows.setState(windowRecord.id, 'normal')">还原</button>
              <button type="button" class="is-danger" @click="windows.close(windowRecord.id)">关闭</button>
            </div>
          </li>
        </ul>

        <p v-else class="window-demo__empty">还没有窗口，先创建一个看看。</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.window-demo {
  display: grid;
  gap: 18px;
}

.window-demo__hero,
.window-demo__panel {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: #ffffff;
}

.window-demo__hero {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.window-demo__eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.window-demo h1,
.window-demo h2,
.window-demo p {
  margin: 0;
}

.window-demo__hero-actions,
.window-demo__actions,
.window-demo__list li div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.window-demo__layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 18px;
}

.window-demo label {
  display: grid;
  gap: 6px;
  color: #334155;
  font-weight: 600;
}

.window-demo input,
.window-demo select,
.window-demo textarea {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.42);
  border-radius: 6px;
  padding: 8px 10px;
  font: inherit;
}

.window-demo button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.window-demo button.is-danger {
  border-color: #ef4444;
  color: #dc2626;
}

.window-demo__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.window-demo__list li {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
}

.window-demo__list span,
.window-demo__empty {
  color: #64748b;
}

@media (max-width: 860px) {
  .window-demo__hero,
  .window-demo__layout {
    grid-template-columns: 1fr;
  }
}
</style>
