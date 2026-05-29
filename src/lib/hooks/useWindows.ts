import { useOptionalWindowsDesktopContext } from '../components/WindowsDesktopContext'
import { useWindowsController } from './useWindowsController'

export function useWindows() {
  const desktopWindows = useOptionalWindowsDesktopContext()?.windows
  if (desktopWindows) {
    return desktopWindows
  }

  return useWindowsController(null, {
    minimizable: false,
  })
}
