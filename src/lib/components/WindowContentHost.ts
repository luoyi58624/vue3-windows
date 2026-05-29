import { computed, defineComponent, h, type PropType } from 'vue'

import { provideCurrentWindowContext } from '../hooks/currentWindow'
import type { WindowsItem, WindowsRef } from '../types'

export default defineComponent({
  name: 'WindowContentHost',
  props: {
    item: {
      type: Object as PropType<WindowsItem>,
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
    const item = computed(() => props.item)
    const api = computed(() => props.api)
    const minimizedCount = computed(() => props.minimizedCount)
    const totalCount = computed(() => props.totalCount)

    provideCurrentWindowContext({
      item,
      api,
      minimizedCount,
      totalCount,
      close: () => props.api.close(props.item.id),
      remove: () => props.api.close(props.item.id),
      hide: () => props.api.hide(props.item.id),
      show: () => props.api.show(props.item.id),
      minimize: () => props.api.minimize(props.item.id),
      maximize: () => props.api.setState(props.item.id, 'maximized'),
      restore: () => props.api.setState(props.item.id, 'normal'),
      moveTop: () => props.api.moveTop(props.item.id),
      setState: (state) => props.api.setState(props.item.id, state),
      update: (patch) => props.api.update(props.item.id, patch),
    })

    return () => {
      if (props.item.component) {
        return h(props.item.component, {
          ...props.item.props,
          item: props.item,
          api: props.api,
          minimizedCount: props.minimizedCount,
          totalCount: props.totalCount,
        })
      }

      return null
    }
  },
})
