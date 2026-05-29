<template>
  <footer class="win10-dock" data-vue3-windows-win10-dock>
    <div class="win10-dock__left">
      <slot name="left" :windows="windows" :items="items" :minimized-items="minimizedItems" />
    </div>

    <div class="win10-dock__scroller" data-vue3-windows-dock-scroller @wheel="handleWheel">
      <div ref="trackRef" class="win10-dock__track" data-vue3-windows-dock-track>
        <slot
          name="tasks"
          :windows="windows"
          :items="items"
          :minimized-items="minimizedItems"
          :TaskComponent="Win10DockTask"
        >
          <Win10DockTask
            v-for="item in minimizedItems"
            :key="item.id"
            :item="item"
          />
        </slot>
      </div>
    </div>

    <div class="win10-dock__right">
      <slot name="right" :windows="windows" :items="items" :minimized-items="minimizedItems" />
    </div>
  </footer>
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
const items = computed(() => context.items.value)
const minimizedItems = computed(() => context.minimizedItems.value)
const trackRef = ref<HTMLElement | null>(null)

const Win10DockTask = defineComponent({
  name: 'Win10DockTask',
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
            'win10-dock-task',
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
          h('span', { class: 'win10-dock-task__mark' }),
          h('span', { class: 'win10-dock-task__title' }, props.item.title || String(props.item.id)),
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
.win10-dock {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  height: 48px;
  background: rgba(16, 16, 16, 0.82);
  color: #fff;
  backdrop-filter: blur(18px);
}

.win10-dock__left,
.win10-dock__right {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 48px;
}

.win10-dock__scroller {
  min-width: 0;
  height: 48px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.win10-dock__track {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  width: max-content;
  min-width: 100%;
  height: 48px;
}

:global(.win10-dock-task) {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: 162px;
  height: 48px;
  padding: 0 12px;
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: default;
}

:global(.win10-dock-task:hover) {
  background: rgba(255, 255, 255, 0.15);
}

:global(.win10-dock-task.is-hidden),
:global(.win10-dock-task.is-minimized) {
  border-bottom-color: rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.04);
}

:global(.win10-dock-task__mark) {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: #0078d4;
  box-shadow: inset 7px 0 0 rgba(255, 255, 255, 0.28);
  flex: 0 0 auto;
}

:global(.win10-dock-task__title) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
</style>
