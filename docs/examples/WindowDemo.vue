<template>
  <WindowsDesktop ref="desktopRef" class="dev-playground">
    <header class="dev-playground__hero">
      <div>
        <p class="dev-playground__eyebrow">Development only</p>
        <h1 class="dev-playground__title">文档测试页</h1>
        <p class="dev-playground__desc">
          这里用于手动验证窗口创建、状态切换、外部点击行为和 dock 交互，不进入生产文档导航。
        </p>
      </div>

      <div class="dev-playground__hero-actions">
        <button type="button" @click="createWindow('compact')">新建紧凑窗口</button>
        <button type="button" @click="createWindow('default')">新建默认窗口</button>
        <button type="button" @click="createWindow('wide')">新建宽窗口</button>
      </div>
    </header>

    <div class="dev-playground__layout">
      <section class="dev-panel dev-panel--controls">
        <h2>创建参数</h2>

        <label class="dev-field">
          <span>标题前缀</span>
          <input v-model="titlePrefix" type="text" />
        </label>

        <label class="dev-field">
          <span>初始备注</span>
          <textarea v-model="seedNote" rows="4" />
        </label>

        <div class="dev-grid">
          <label class="dev-field">
            <span>外部点击</span>
            <select v-model="outsideClickBehavior">
              <option value="none">none</option>
              <option value="hide">hide</option>
              <option value="minimize">minimize</option>
              <option value="remove">remove</option>
            </select>
          </label>

          <label class="dev-field">
            <span>强调色</span>
            <select v-model="accentType">
              <option value="primary">primary</option>
              <option value="success">success</option>
              <option value="warning">warning</option>
              <option value="danger">danger</option>
              <option value="info">info</option>
            </select>
          </label>
        </div>

        <div class="dev-actions">
          <button type="button" @click="desktopRef?.hideAll()">全部隐藏</button>
          <button type="button" @click="desktopRef?.showAll()">全部显示</button>
          <button type="button" class="is-danger" @click="desktopRef?.closeAll()">全部关闭</button>
        </div>
      </section>

      <section class="dev-panel dev-panel--stage">
        <div class="dev-stage">
          <div class="dev-stage__empty">
            <strong>窗口始终相对全局视口显示</strong>
            <span>当前区域只负责 dock 停靠和测试操作入口。</span>
          </div>
        </div>
      </section>

      <section class="dev-panel dev-panel--windows">
        <h2>当前窗口</h2>

        <ul v-if="windowSummaries.length" class="dev-window-list">
          <li v-for="windowRecord in windowSummaries" :key="windowRecord.id">
            <div class="dev-window-list__meta">
              <strong>{{ windowRecord.title }}</strong>
              <span>{{ windowRecord.state }} · {{ windowRecord.visible ? 'visible' : 'hidden' }}</span>
            </div>

            <div class="dev-window-list__actions">
              <button type="button" @click="desktopRef?.moveTop(windowRecord.id)">置顶</button>
              <button type="button" @click="desktopRef?.setState(windowRecord.id, 'minimized')">最小化</button>
              <button type="button" @click="desktopRef?.setState(windowRecord.id, 'maximized')">最大化</button>
              <button type="button" @click="desktopRef?.setState(windowRecord.id, 'normal')">还原</button>
              <button type="button" @click="toggleVisibility(windowRecord.id, windowRecord.visible)">
                {{ windowRecord.visible ? '隐藏' : '显示' }}
              </button>
              <button type="button" class="is-danger" @click="desktopRef?.close(windowRecord.id)">关闭</button>
            </div>
          </li>
        </ul>

        <p v-else class="dev-empty">还没有窗口，先创建一个看看。</p>
      </section>
    </div>
  </WindowsDesktop>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AccentType, WindowId, WindowOutsideClickBehavior, WindowsDesktopRef } from 'vue3-windows'
import { WindowsDesktop } from 'vue3-windows'

import PlaygroundWindowContent from './PlaygroundWindowContent.vue'

type WindowPreset = 'compact' | 'default' | 'wide'

const desktopRef = ref<WindowsDesktopRef | null>(null)

const titlePrefix = ref('测试窗口')
const seedNote = ref('用于验证手动交互、状态切换和 dock 行为。')
const outsideClickBehavior = ref<WindowOutsideClickBehavior>('minimize')
const accentType = ref<AccentType>('primary')

let nextWindowId = 1

const windowSummaries = computed(() =>
  desktopRef.value?.windows.map((windowRecord) => ({
    id: windowRecord.id,
    title: windowRecord.title,
    state: windowRecord.state,
    visible: windowRecord.visible,
  })) ?? [],
)

function createWindow(preset: WindowPreset) {
  const index = nextWindowId++
  const dimensions = getDimensions(preset)

  desktopRef.value?.create({
    title: `${titlePrefix.value} ${index}`,
    component: PlaygroundWindowContent,
    width: dimensions.width,
    height: dimensions.height,
    outsideClickBehavior: outsideClickBehavior.value,
    accentType: accentType.value,
    note: seedNote.value,
  })
}

function toggleVisibility(id: WindowId, visible: boolean) {
  if (visible) {
    desktopRef.value?.hide(id)
    return
  }

  desktopRef.value?.show(id)
}

function getDimensions(preset: WindowPreset) {
  if (preset === 'compact') {
    return { width: 560, height: 380 }
  }

  if (preset === 'wide') {
    return { width: 920, height: 560 }
  }

  return { width: 760, height: 500 }
}
</script>

<style scoped>
.dev-playground {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  height: calc(100vh - var(--vp-nav-height, 0px) - 48px);
  min-height: calc(100vh - var(--vp-nav-height, 0px) - 48px);
  overflow: hidden;
  padding: 16px;
  background: #f8fafc;
}

.dev-playground__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.dev-playground__eyebrow {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
}

.dev-playground__title {
  margin: 0;
  color: #0f172a;
  font-size: 28px;
  line-height: 1.15;
}

.dev-playground__desc {
  margin: 8px 0 0;
  max-width: 760px;
  color: #475569;
}

.dev-playground__hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.dev-playground__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 360px;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
  flex: 1;
}

.dev-panel {
  display: grid;
  align-content: start;
  gap: 16px;
  min-height: 0;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: #fff;
}

.dev-panel h2 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
}

.dev-panel--stage {
  padding: 0;
  overflow: hidden;
}

.dev-panel--controls {
  overflow: auto;
}

.dev-panel--windows {
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.dev-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 100%;
  padding: 24px;
  background:
    linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    #fff;
  background-size: 24px 24px;
}

.dev-stage__empty {
  display: grid;
  gap: 6px;
  padding: 16px;
  text-align: center;
  color: #475569;
}

.dev-stage__empty strong {
  color: #0f172a;
}

.dev-field {
  display: grid;
  gap: 8px;
}

.dev-field span {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.dev-field input,
.dev-field textarea,
.dev-field select {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f172a;
  outline: none;
  background: #fff;
}

.dev-field textarea {
  resize: vertical;
}

.dev-field input:focus,
.dev-field textarea:focus,
.dev-field select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.dev-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.dev-actions,
.dev-window-list__actions,
.dev-playground__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  border-color: #2563eb;
  color: #2563eb;
}

button.is-danger:hover {
  border-color: #dc2626;
  color: #dc2626;
}

.dev-window-list {
  display: grid;
  align-content: start;
  gap: 12px;
  margin: 0;
  padding: 0;
  min-height: 0;
  overflow: auto;
  list-style: none;
}

.dev-panel--windows .dev-empty {
  align-self: start;
}

.dev-window-list li {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: #f8fafc;
}

.dev-window-list__meta {
  display: grid;
  gap: 4px;
}

.dev-window-list__meta strong {
  color: #0f172a;
}

.dev-window-list__meta span,
.dev-empty {
  color: #64748b;
}

@media (max-width: 1280px) {
  .dev-playground__layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dev-panel--stage {
    grid-column: 1 / -1;
    min-height: 360px;
  }
}

@media (max-width: 768px) {
  .dev-playground {
    height: auto;
    min-height: auto;
    overflow: visible;
  }

  .dev-playground__hero {
    align-items: stretch;
    flex-direction: column;
  }

  .dev-playground__layout,
  .dev-grid {
    grid-template-columns: 1fr;
  }

  .dev-playground__layout {
    overflow: visible;
  }
}
</style>
