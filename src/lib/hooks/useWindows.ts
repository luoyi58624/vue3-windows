import { useOptionalWindowsDesktopContext } from '../components/WindowsDesktopContext'
import { useWindowsController } from './useWindowsController'
import type { UseWindowsOptions } from '../types'

export function useWindows(options: UseWindowsOptions = {}) {
  if (!options.simple) {
    const desktopWindows = useOptionalWindowsDesktopContext()?.windows
    if (desktopWindows) {
      return desktopWindows
    }
  }

  return useWindowsController(null, {
    ...options,
    minimizable: false,
  })
}
