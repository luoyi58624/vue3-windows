import { inject, ref, type InjectionKey, type Ref } from 'vue'

import type { WindowsSetupOptions } from '../types'

export type WindowsSetupConfigRef = Readonly<Ref<WindowsSetupOptions>>

export const windowsSetupConfigKey: InjectionKey<WindowsSetupConfigRef> = Symbol('vue3-windows:setup-config')

const defaultWindowsSetupOptions: WindowsSetupConfigRef = ref({})

export function useWindowsSetupOptions() {
  return inject(windowsSetupConfigKey, defaultWindowsSetupOptions)
}
