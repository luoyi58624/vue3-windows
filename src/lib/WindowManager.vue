<template>
  <div class="window-manager">
    <div :id="dockId" class="window-manager__dock" />

    <Window
      v-for="item in visibleItems"
      :key="item.id"
      :model-value="item.visible"
      :title="item.title"
      :width="item.width"
      :height="item.height"
      :accent-type="item.accentType ?? 'primary'"
      :dock-index="getDockIndex(item.id)"
      :minimize-to="`#${dockId}`"
      @update:model-value="handleVisibilityChange(item.id, $event)"
      @minimize-start="handleMinimizeStart(item.id)"
      @minimize="updateWindowState(item.id, 'minimized')"
      @maximize="updateWindowState(item.id, 'maximized')"
      @restore="updateWindowState(item.id, 'normal')"
      @closed="handleClosed(item.id)"
    >
      <template #title>
        <slot name="title" :item="item">
          {{ item.title }}
        </slot>
      </template>

      <slot
        name="window"
        :item="item"
        :minimized-count="minimizedItems.length"
        :total-count="model.length"
      />

      <template v-if="$slots.footer" #footer>
        <slot name="footer" :item="item" />
      </template>
    </Window>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import Window from './Window.vue'
import type { WindowManagerItem, WindowState } from './types'

type ManagedWindowState = WindowState

const model = defineModel<WindowManagerItem[]>('items', {
  default: () => [],
})

const dockId = `window-dock-${Math.random().toString(36).slice(2, 8)}`
const minimizedOrder = ref<WindowManagerItem['id'][]>([])

const visibleItems = computed(() => model.value.filter((item) => item.visible))
const visibleItemMap = computed(() => new Map(visibleItems.value.map((item) => [item.id, item])))
const minimizedItems = computed(() => {
  return minimizedOrder.value
    .map((id) => visibleItemMap.value.get(id))
    .filter((item): item is WindowManagerItem => Boolean(item && item.state === 'minimized'))
})

watch(
  visibleItems,
  (items) => {
    const visibleMinimizedIds = items
      .filter((item) => item.state === 'minimized')
      .map((item) => item.id)
    const visibleMinimizedIdSet = new Set(visibleMinimizedIds)
    const nextOrder = minimizedOrder.value.filter((id) => visibleMinimizedIdSet.has(id))

    for (const id of visibleMinimizedIds) {
      if (!nextOrder.includes(id)) {
        nextOrder.push(id)
      }
    }

    minimizedOrder.value = nextOrder
  },
  { immediate: true, deep: true },
)

function getDockIndex(id: WindowManagerItem['id']) {
  const item = visibleItemMap.value.get(id)
  if (!item) {
    return 0
  }

  const existingIndex = minimizedOrder.value.indexOf(id)
  return existingIndex === -1 ? minimizedOrder.value.length : existingIndex
}

function handleMinimizeStart(id: WindowManagerItem['id']) {
  if (visibleItemMap.value.has(id)) {
    queueMinimizedWindow(id)
  }
}

function updateWindowState(id: WindowManagerItem['id'], state: ManagedWindowState) {
  const target = model.value.find((item) => item.id === id)
  if (!target) {
    return
  }

  target.state = state

  if (state === 'minimized' && target.visible) {
    queueMinimizedWindow(id)
    return
  }

  removeMinimizedWindow(id)
}

function handleVisibilityChange(id: WindowManagerItem['id'], visible: boolean) {
  const target = model.value.find((item) => item.id === id)
  if (!target) {
    return
  }

  if (visible) {
    target.visible = true
    return
  }

  handleClosed(id)
}

function handleClosed(id: WindowManagerItem['id']) {
  removeMinimizedWindow(id)
  model.value = model.value.filter((item) => item.id !== id)
}

function queueMinimizedWindow(id: WindowManagerItem['id']) {
  minimizedOrder.value = [...minimizedOrder.value.filter((itemId) => itemId !== id), id]
}

function removeMinimizedWindow(id: WindowManagerItem['id']) {
  minimizedOrder.value = minimizedOrder.value.filter((itemId) => itemId !== id)
}
</script>

<style scoped>
.window-manager {
  position: absolute;
  inset: 0;
}

.window-manager__dock {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  height: 60px;
  pointer-events: none;
}
</style>
