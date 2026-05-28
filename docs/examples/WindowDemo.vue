<template>
  <div class="demo-page">
    <header class="demo-page__header">
      <div>
        <p class="demo-page__eyebrow">vue3-windows</p>
        <h1 class="demo-page__title">Vue 3 多窗口组件</h1>
        <p class="demo-page__desc">
          支持拖拽、缩放、最大化、最小化到局部 dock，并由 WindowManager 管理窗口队列。
        </p>
      </div>

      <div class="demo-page__actions">
        <button class="demo-page__action" @click="openWindow('note')">打开便签</button>
        <button class="demo-page__action" @click="openWindow('stats')">打开指标</button>
        <button class="demo-page__action" @click="openWindow('preview')">打开预览</button>
      </div>
    </header>

    <section class="demo-page__stage">
      <WindowManager v-model:items="windows">
        <template #window="{ item, minimizedCount, totalCount }">
          <template v-if="item.kind === 'note'">
            <div class="window-content">
              <label class="demo-field">
                <span>便签内容</span>
                <textarea v-model="item.note" rows="8" />
              </label>
            </div>
          </template>

          <template v-else-if="item.kind === 'stats'">
            <div class="window-grid">
              <div class="window-card">
                <strong>活动窗口</strong>
                <span>{{ totalCount }}</span>
              </div>
              <div class="window-card">
                <strong>最小化</strong>
                <span>{{ minimizedCount }}</span>
              </div>
              <div class="window-card">
                <strong>当前 ID</strong>
                <span>#{{ item.id }}</span>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="window-preview">
              <div class="window-preview__panel">
                <span />
                <span />
                <span />
              </div>
              <p>这是一个干净利落的窗口预览块。</p>
            </div>
          </template>
        </template>
      </WindowManager>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WindowManager, type WindowManagerItem } from 'vue3-windows'

type WindowKind = 'note' | 'stats' | 'preview'

interface DemoWindowItem extends WindowManagerItem {
  id: number
  kind: WindowKind
  width: number
  height: number
  accentType: 'primary' | 'success' | 'info'
  note: string
}

const windows = ref<DemoWindowItem[]>([])
let nextWindowId = 1

function openWindow(kind: WindowKind) {
  const id = nextWindowId++
  windows.value.push(createWindowTemplate(kind, id))
}

function createWindowTemplate(kind: WindowKind, id: number): DemoWindowItem {
  switch (kind) {
    case 'note':
      return {
        id,
        kind,
        title: `便签 ${id}`,
        accentType: 'primary',
        width: 460,
        height: 340,
        visible: true,
        state: 'normal',
        note: '写点东西，最小化后会进入左下角堆叠。',
      }
    case 'stats':
      return {
        id,
        kind,
        title: `指标 ${id}`,
        accentType: 'success',
        width: 520,
        height: 320,
        visible: true,
        state: 'normal',
        note: '',
      }
    case 'preview':
      return {
        id,
        kind,
        title: `预览 ${id}`,
        accentType: 'info',
        width: 500,
        height: 360,
        visible: true,
        state: 'normal',
        note: '',
      }
  }
}
</script>

<style scoped>
.demo-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: calc(100vh - var(--vp-nav-height));
  min-height: 560px;
  padding: 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 32%),
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 26%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.demo-page__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.demo-page__eyebrow {
  margin: 0 0 8px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
}

.demo-page__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
}

.demo-page__desc {
  margin: 8px 0 0;
  color: #475569;
}

.demo-page__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.demo-page__action {
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb 0%, #0f766e 100%);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.2);
}

.demo-page__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.38);
  backdrop-filter: blur(8px);
}

.window-content,
.window-preview {
  display: grid;
  gap: 12px;
}

.demo-field {
  display: grid;
  gap: 8px;
  color: #475569;
  font-weight: 600;
}

.demo-field textarea {
  width: 100%;
  resize: none;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 12px;
  padding: 12px;
  color: #0f172a;
  outline: none;
}

.demo-field textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.window-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.window-card {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
}

.window-card span {
  font-size: 24px;
  font-weight: 700;
}

.window-preview {
  justify-items: start;
}

.window-preview__panel {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(16, 185, 129, 0.12));
}

.window-preview__panel span {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
}
</style>
