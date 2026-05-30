<template>
  <section class="windows-desktop" data-vue3-windows-desktop>
    <slot />
    <slot
      name="dock"
      :manager="manager"
      :windows="windows"
      :minimized-windows="minimizedWindows"
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

const manager = useWindowsController(dockTargetRef, {
  animated: props.animated,
  maximizeTarget: props.maximizeTarget,
})

const windows = computed(() => manager.windows.value)
const minimizedWindows = computed(() => manager.windows.value.filter((windowRecord) => windowRecord.visible && windowRecord.state === 'minimized'))
const context = {
  manager,
  windows,
  minimizedWindows,
}

provideWindowsDesktopContext(context)

defineExpose<WindowsRef>({
  windows: manager.windows,
  create: manager.create,
  close: manager.close,
  closeAll: manager.closeAll,
  hide: manager.hide,
  hideAll: manager.hideAll,
  show: manager.show,
  showAll: manager.showAll,
  minimize: manager.minimize,
  moveTop: manager.moveTop,
  get: manager.get,
  update: manager.update,
  setState: manager.setState,
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
