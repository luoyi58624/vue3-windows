import type { App } from 'vue'

import Window from './Window.vue'
import WindowManager from './WindowManager.vue'

export { Window, WindowManager }
export type { AccentType, WindowManagerItem, WindowState } from './types'

export default {
  install(app: App) {
    app.component('Window', Window)
    app.component('WindowManager', WindowManager)
  },
}
