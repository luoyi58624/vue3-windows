<template>
  <section class="windows-desktop" data-vue3-windows-desktop>
    <slot />
    <slot
      name="dock"
      :windows="windows"
      :items="items"
      :minimized-items="minimizedItems"
      :set-dock-target="handleDockTargetChange"
    >
      <WindowsDock @dock-target-change="handleDockTargetChange">
        <template v-if="$slots['dock-left']" #left>
          <slot name="dock-left" />
        </template>
        <template v-if="$slots['dock-right']" #right>
          <slot name="dock-right" />
        </template>
      </WindowsDock>
    </slot>
  </section>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'

import { provideWindowsDesktopContext } from './WindowsDesktopContext'
import WindowsDock from './WindowsDock.vue'
import { useWindowsController } from '../hooks/useWindowsController'
import type { WindowAnchorTarget, WindowsRef } from '../types'

const props = defineProps({
  animated: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  maximizeTarget: {
    type: [String, Object] as PropType<WindowAnchorTarget | null>,
    default: null,
  },
})

const dockTargetRef = ref<HTMLElement | null>(null)

const windows = useWindowsController(dockTargetRef, {
  animated: props.animated,
  maximizeTarget: props.maximizeTarget,
})

const items = computed(() => windows.items.value)
const minimizedItems = computed(() => windows.items.value.filter((item) => item.visible && item.state === 'minimized'))
const context = {
  windows,
  items,
  minimizedItems,
}

provideWindowsDesktopContext(context)

defineExpose<WindowsRef>({
  items: windows.items,
  create: windows.create,
  close: windows.close,
  closeAll: windows.closeAll,
  hide: windows.hide,
  hideAll: windows.hideAll,
  show: windows.show,
  showAll: windows.showAll,
  minimize: windows.minimize,
  moveTop: windows.moveTop,
  get: windows.get,
  update: windows.update,
  setState: windows.setState,
})

function handleDockTargetChange(target: HTMLElement | null) {
  dockTargetRef.value = target
}
</script>

<style scoped>
.windows-desktop {
  position: relative;
  min-height: 100%;
  overflow: hidden;
}

</style>
