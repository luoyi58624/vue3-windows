import type { UseWindowsOptions } from '../types'
import { useWindowsController } from './useWindowsController'

export function useWindows(options: UseWindowsOptions = {}) {
  return useWindowsController(options)
}
