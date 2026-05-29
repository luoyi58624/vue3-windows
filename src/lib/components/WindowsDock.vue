<template>
  <div class="windows-dock" data-vue3-windows-dock>
    <div class="windows-dock__left">
      <slot name="left" />
    </div>

    <div
      class="windows-dock__scroller"
      data-vue3-windows-dock-scroller
      @wheel="handleWheel"
    >
      <div ref="trackRef" class="windows-dock__track" data-vue3-windows-dock-track>
        <WindowsDockTask
          v-for="item in minimizedItems"
          :key="item.id"
          :item="item"
        />
      </div>
    </div>

    <div class="windows-dock__right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
import type { PropType } from 'vue'

import { useWindowsDesktopContext } from './WindowsDesktopContext'
import type { WindowsItem } from '../types'

const emit = defineEmits<{
  dockTargetChange: [target: HTMLElement | null]
}>()

const context = useWindowsDesktopContext()
const windows = context.windows
const minimizedItems = computed(() => context.minimizedItems.value)
const trackRef = ref<HTMLElement | null>(null)

const WindowsDockTask = defineComponent({
  name: 'WindowsDockTask',
  props: {
    item: {
      type: Object as PropType<WindowsItem>,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          class: [
            'windows-dock-task',
            {
              'is-hidden': !props.item.visible,
              'is-minimized': props.item.state === 'minimized',
            },
          ],
          'data-vue3-windows-dock-task': '',
          'data-vue3-windows-window-id': String(props.item.id),
          title: props.item.title,
          onClick: () => windows.moveTop(props.item.id),
        },
        [
          h('span', { class: 'windows-dock-task__accent' }),
          h('span', { class: 'windows-dock-task__title' }, props.item.title || String(props.item.id)),
        ],
      )
  },
})

onMounted(syncDockTarget)
onUpdated(syncDockTarget)
onBeforeUnmount(() => {
  emit('dockTargetChange', null)
})

function syncDockTarget() {
  emit('dockTargetChange', trackRef.value)
}

function handleWheel(event: WheelEvent) {
  const scroller = event.currentTarget as HTMLElement | null
  if (!scroller) {
    return
  }

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (delta === 0) {
    return
  }

  event.preventDefault()
  scroller.scrollLeft += delta
}
</script>

<style scoped>
.windows-dock {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  height: 64px;
  pointer-events: none;
}

.windows-dock__left,
.windows-dock__right {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  pointer-events: auto;
}

.windows-dock__scroller {
  min-width: 0;
  height: 64px;
  overflow-x: auto;
  overflow-y: hidden;
  pointer-events: auto;
  scrollbar-width: thin;
}

.windows-dock__track {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: max-content;
  min-width: 100%;
  height: 64px;
  padding: 6px 0;
  box-sizing: border-box;
}

:deep(.windows-dock-task) {
  height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: #334155;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

:deep(.windows-dock-task) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 180px;
  padding: 0 12px;
}

:deep(.windows-dock-task.is-minimized) {
  opacity: 0.78;
}

:deep(.windows-dock-task.is-hidden) {
  opacity: 0.54;
}

:deep(.windows-dock-task__accent) {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #2563eb;
  flex: 0 0 auto;
}

:deep(.windows-dock-task__title) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
