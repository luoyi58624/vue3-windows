import type { UseWindowsOptions, WindowsGroupId, WindowsRef } from '../types'
import { useWindowsController } from './useWindowsController'

export function useWindows(options?: UseWindowsOptions): WindowsRef
export function useWindows(id: WindowsGroupId | undefined, options?: UseWindowsOptions): WindowsRef
export function useWindows(id: WindowsGroupId, options?: UseWindowsOptions): WindowsRef
export function useWindows(
  idOrOptions: WindowsGroupId | UseWindowsOptions | undefined = {},
  options: UseWindowsOptions = {},
): WindowsRef {
  if (idOrOptions === undefined) {
    return useWindowsController(options)
  }

  if (typeof idOrOptions === 'string' || typeof idOrOptions === 'number') {
    return useWindowsController({
      ...options,
      id: idOrOptions,
    })
  }

  return useWindowsController(idOrOptions)
}
