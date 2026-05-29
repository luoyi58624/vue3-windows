<template>
  <slot />
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, provide } from 'vue'

import { windowsSetupConfigKey } from '../hooks/setupWindows'
import type { AccentType, WindowOutsideClickBehavior, WindowsSetupOptions } from '../types'

const props = defineProps({
  animated: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  outsideClickBehavior: {
    type: String as PropType<WindowOutsideClickBehavior | undefined>,
    default: undefined,
  },
  width: {
    type: Number,
    default: undefined,
  },
  height: {
    type: Number,
    default: undefined,
  },
  minWidth: {
    type: Number,
    default: undefined,
  },
  minHeight: {
    type: Number,
    default: undefined,
  },
  maxWidth: {
    type: Number,
    default: undefined,
  },
  maxHeight: {
    type: Number,
    default: undefined,
  },
  minimizable: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  maximizable: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  closable: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  accentType: {
    type: String as PropType<AccentType | undefined>,
    default: undefined,
  },
  bgColor: {
    type: String,
    default: undefined,
  },
})

const config = computed<WindowsSetupOptions>(() => {
  const nextConfig: WindowsSetupOptions = {}

  assignDefined(nextConfig, 'animated', props.animated)
  assignDefined(nextConfig, 'outsideClickBehavior', props.outsideClickBehavior)
  assignDefined(nextConfig, 'width', props.width)
  assignDefined(nextConfig, 'height', props.height)
  assignDefined(nextConfig, 'minWidth', props.minWidth)
  assignDefined(nextConfig, 'minHeight', props.minHeight)
  assignDefined(nextConfig, 'maxWidth', props.maxWidth)
  assignDefined(nextConfig, 'maxHeight', props.maxHeight)
  assignDefined(nextConfig, 'minimizable', props.minimizable)
  assignDefined(nextConfig, 'maximizable', props.maximizable)
  assignDefined(nextConfig, 'closable', props.closable)
  assignDefined(nextConfig, 'accentType', props.accentType)
  assignDefined(nextConfig, 'bgColor', props.bgColor)

  return nextConfig
})

provide(windowsSetupConfigKey, config)

function assignDefined<Key extends keyof WindowsSetupOptions>(
  target: WindowsSetupOptions,
  key: Key,
  value: WindowsSetupOptions[Key],
) {
  if (value !== undefined) {
    target[key] = value
  }
}
</script>
