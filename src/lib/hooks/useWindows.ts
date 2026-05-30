import { useOptionalWindowsDesktopContext } from '../components/WindowsDesktopContext'
import type { UseWindowsOptions } from '../types'
import { useWindowsController } from './useWindowsController'

export function useWindows(options: UseWindowsOptions = {}) {
  const { global: forceGlobal, ...controllerOptions } = options
  const desktopManager = useOptionalWindowsDesktopContext()?.manager
  if (!forceGlobal && desktopManager) {
    return desktopManager
  }

  return useWindowsController(null, {
    ...controllerOptions,
    minimizable: false,
  })
}
