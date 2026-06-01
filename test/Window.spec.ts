import { mount } from '@vue/test-utils'
import { defineComponent, h, inject, isRef, nextTick, provide, ref, type InjectionKey, type Ref } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useWindows, windowSetup } from '../src'
import type { UseWindowsOptions, WindowsRef } from '../src'

const RUNTIME_KEY = '__window_dialog_runtime__'
const messageKey = Symbol('message') as InjectionKey<string>
const countKey = Symbol('count') as InjectionKey<Ref<number>>

const configReset = {
  outsideClickBehavior: undefined,
  width: undefined,
  height: undefined,
  minWidth: undefined,
  minHeight: undefined,
  maxWidth: undefined,
  maxHeight: undefined,
  minimizable: undefined,
  maximizable: undefined,
  closable: undefined,
  accentType: undefined,
  bgColor: undefined,
  zIndex: undefined,
}

function resetWindowRuntime() {
  delete (globalThis as Record<string, unknown>)[RUNTIME_KEY]
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  window.localStorage.removeItem('vue3-windows:geometry')
  windowSetup(configReset)
}

function findPanelByText(text: string) {
  return Array.from(document.body.querySelectorAll('.window-dialog')).find((panel) =>
    panel.textContent?.includes(text),
  ) as HTMLElement | undefined
}

function getLayerZIndex(panel: HTMLElement | undefined) {
  return Number(panel?.closest<HTMLElement>('.window-dialog-layer')?.style.zIndex)
}

async function flushWindows() {
  await nextTick()
  await nextTick()
}

const BasicContent = defineComponent({
  name: 'BasicContent',
  setup() {
    return () => h('div', { class: 'basic-content' }, 'Priority content')
  },
})

const InjectedContent = defineComponent({
  name: 'InjectedContent',
  setup() {
    const message = inject(messageKey, 'missing')
    const count = inject(countKey)!

    return () =>
      h(
        'button',
        {
          class: 'injected-count',
          type: 'button',
          'data-is-ref': String(isRef(count)),
          onClick: () => {
            count.value += 1
          },
        },
        `${message}: ${count.value}`,
      )
  },
})

const BindWindows = defineComponent({
  name: 'BindWindows',
  props: {
    bind: {
      type: Function,
      required: true,
    },
    options: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const windows = useWindows(props.options as UseWindowsOptions)
    props.bind(windows)

    return () => h('div')
  },
})

describe('useWindows rendering', () => {
  beforeEach(() => {
    resetWindowRuntime()
  })

  it('applies create options over useWindows options and global windowSetup defaults', async () => {
    windowSetup({
      width: 700,
      height: 410,
      minimizable: false,
      closable: false,
      accentType: 'success',
      zIndex: 300,
    })

    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
        options: {
          width: 640,
          maximizable: false,
          zIndex: 200,
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'priority',
      title: 'Priority',
      component: BasicContent,
      width: 520,
      closable: true,
      zIndex: 150,
    })
    await flushWindows()

    const panel = findPanelByText('Priority')
    expect(panel).toBeDefined()
    expect(panel?.style.width).toBe('520px')
    expect(panel?.style.height).toBe('410px')
    expect(panel?.querySelector('[aria-label="关闭"]')).not.toBeNull()
    expect(panel?.querySelector('[aria-label="最小化"]')).toBeNull()
    expect(panel?.querySelector('[aria-label="最大化"]')).toBeNull()
    expect(getLayerZIndex(panel)).toBe(150)

    windows?.create({
      id: 'manager-z-index',
      title: 'Manager Z Index',
      component: BasicContent,
    })
    await flushWindows()

    const managerPanel = findPanelByText('Manager Z Index')
    expect(getLayerZIndex(managerPanel)).toBe(200)

    let globalWindows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          globalWindows = api
        },
      },
    })
    await flushWindows()
    globalWindows?.create({
      id: 'global-z-index',
      title: 'Global Z Index',
      component: BasicContent,
    })
    await flushWindows()

    const globalPanel = findPanelByText('Global Z Index')
    expect(getLayerZIndex(globalPanel)).toBe(300)
  })

  it('uses default width and minimum size without forcing auto height', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'default-size',
      title: 'Default Size',
      component: BasicContent,
    })
    await flushWindows()

    const panel = findPanelByText('Priority content')
    expect(panel).toBeDefined()
    expect(panel?.style.width).toBe('600px')
    expect(panel?.style.minHeight).toBe('200px')
    expect(panel?.style.height).toBe('')
    expect(getLayerZIndex(panel)).toBe(100)
  })

  it('uses the default minWidth as the lower bound for window width', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    windows?.create({
      id: 'min-width',
      title: 'Min Width',
      component: BasicContent,
      width: 120,
    })
    await flushWindows()

    const panel = findPanelByText('Priority content')
    expect(panel).toBeDefined()
    expect(panel?.style.width).toBe('200px')
    expect(panel?.style.height).toBe('')
  })

  it('uses the component name as the effective id when create id is null', async () => {
    let windows: WindowsRef | null = null
    mount(BindWindows, {
      props: {
        bind: (api: WindowsRef) => {
          windows = api
        },
      },
    })

    await flushWindows()
    const first = windows?.create({
      id: null,
      title: 'Component Singleton',
      component: BasicContent,
    })
    await flushWindows()

    expect(first?.id).toBe('BasicContent')
    expect(first?.component).toBe(BasicContent)
    expect(windows?.get('BasicContent')?.title).toBe('Component Singleton')
    expect(findPanelByText('Priority content')).toBeDefined()

    const second = windows?.create({
      id: null,
      title: 'Component Singleton Updated',
      component: BasicContent,
    })
    await flushWindows()

    expect(second?.id).toBe('BasicContent')
    expect(second?.component).toBe(BasicContent)
    expect(windows?.windows.value).toHaveLength(1)
    expect(windows?.get('BasicContent')?.title).toBe('Component Singleton Updated')

    windows?.close('BasicContent')
    await flushWindows()

    expect(windows?.get('BasicContent')).toBeUndefined()
    expect(windows?.windows.value).toHaveLength(0)
  })

  it('keeps Vue provide and inject available inside created window content', async () => {
    const wrapper = mount(defineComponent({
      name: 'ProvideHost',
      setup() {
        const windows = useWindows()
        const count = ref(0)

        provide(messageKey, 'provided')
        provide(countKey, count)

        return {
          count,
          windows,
        }
      },
      template: '<div />',
    }))

    await flushWindows()
    wrapper.vm.windows.create({
      id: 'injected',
      title: 'Injected',
      component: InjectedContent,
    })
    await flushWindows()

    const button = document.body.querySelector<HTMLButtonElement>('.injected-count')
    expect(button).not.toBeNull()
    expect(button?.dataset.isRef).toBe('true')
    expect(button?.textContent).toContain('provided: 0')

    button?.click()
    await flushWindows()

    expect(wrapper.vm.count).toBe(1)
    expect(button?.textContent).toContain('provided: 1')
  })

  it('inherits provides registered after useWindows when create is called later', async () => {
    const wrapper = mount(defineComponent({
      name: 'LateProvideHost',
      setup() {
        const windows = useWindows()
        const count = ref(0)

        provide(messageKey, 'late')
        provide(countKey, count)

        return {
          count,
          windows,
        }
      },
      template: '<div />',
    }))

    await flushWindows()
    wrapper.vm.windows.create({
      id: 'late-injected',
      title: 'Late Injected',
      component: InjectedContent,
    })
    await flushWindows()

    const button = document.body.querySelector<HTMLButtonElement>('.injected-count')
    expect(button).not.toBeNull()
    expect(button?.textContent).toContain('late: 0')

    button?.click()
    await flushWindows()

    expect(wrapper.vm.count).toBe(1)
    expect(button?.textContent).toContain('late: 1')
  })
})
