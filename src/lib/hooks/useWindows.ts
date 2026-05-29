import { useOptionalWindowsDesktopContext } from '../components/WindowsDesktopContext'
import type { UseWindowsOptions } from '../types'
import { useWindowsController } from './useWindowsController'

export function useWindows(options: UseWindowsOptions = {}) {
  const { global: forceGlobal, ...controllerOptions } = options
  const desktopWindows = useOptionalWindowsDesktopContext()?.windows
  if (!forceGlobal && desktopWindows) {
    return desktopWindows
  }

  return useWindowsController(null, {
    ...controllerOptions,
    minimizable: false,
  })
}
