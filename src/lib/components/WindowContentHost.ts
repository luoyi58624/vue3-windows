import { computed, defineComponent, h, type PropType } from 'vue'

import { provideCurrentWindowContext } from '../hooks/currentWindow'
import { inheritWindowOwnerProvides } from '../hooks/windowOwnerContext'
import type { WindowRecord, WindowsRef } from '../types'

export default defineComponent({
  name: 'WindowContentHost',
  props: {
    windowRecord: {
      type: Object as PropType<WindowRecord>,
      required: true,
    },
    api: {
      type: Object as PropType<WindowsRef>,
      required: true,
    },
    minimizedCount: {
      type: Number,
      required: true,
    },
    totalCount: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    inheritWindowOwnerProvides(props.windowRecord)

    const windowRecord = computed(() => props.windowRecord)
    const api = computed(() => props.api)
    const minimizedCount = computed(() => props.minimizedCount)
    const totalCount = computed(() => props.totalCount)

    provideCurrentWindowContext({
      window: windowRecord,
      api,
      minimizedCount,
      totalCount,
      close: () => props.api.close(props.windowRecord.id),
      remove: () => props.api.close(props.windowRecord.id),
      minimize: () => props.api.minimize(props.windowRecord.id),
      maximize: () => props.api.setState(props.windowRecord.id, 'maximized'),
      restore: () => props.api.setState(props.windowRecord.id, 'normal'),
      moveTop: () => props.api.moveTop(props.windowRecord.id),
      setState: (state) => props.api.setState(props.windowRecord.id, state),
      update: (patch) => props.api.update(props.windowRecord.id, patch),
    })

    return () => {
      if (props.windowRecord.component) {
        return h(props.windowRecord.component, {
          ...props.windowRecord.props,
          ...resolveWindowComponentInjectedProps(props.windowRecord.component, {
            window: props.windowRecord,
            api: props.api,
            minimizedCount: props.minimizedCount,
            totalCount: props.totalCount,
          }),
        })
      }

      return null
    }
  },
})

function resolveWindowComponentInjectedProps(
  component: WindowRecord['component'],
  injectedProps: Record<string, unknown>,
) {
  const declaredPropNames = getDeclaredPropNames(component)
  if (declaredPropNames.size === 0) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(injectedProps).filter(([key]) => declaredPropNames.has(key)),
  )
}

function getDeclaredPropNames(component: WindowRecord['component']) {
  if (!component || typeof component === 'string') {
    return new Set<string>()
  }

  const propOptions = (component as { props?: unknown }).props
  if (Array.isArray(propOptions)) {
    return new Set(propOptions)
  }

  if (propOptions && typeof propOptions === 'object') {
    return new Set(Object.keys(propOptions as Record<string, unknown>))
  }

  return new Set<string>()
}
