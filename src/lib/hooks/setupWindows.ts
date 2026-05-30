import type { WindowsConfig } from '../types'

const globalWindowsConfig: WindowsConfig = {}

export function windowSetup(options: Partial<WindowsConfig>) {
  for (const key of Object.keys(options) as Array<keyof WindowsConfig>) {
    const value = options[key]
    if (value === undefined) {
      delete globalWindowsConfig[key]
      continue
    }

    globalWindowsConfig[key] = value as never
  }
}

export function getWindowSetupConfig(): Readonly<WindowsConfig> {
  return globalWindowsConfig
}
