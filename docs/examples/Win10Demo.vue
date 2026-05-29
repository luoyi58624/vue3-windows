<template>
  <WindowsDesktop ref="desktopRef" class="win10-desktop" :animated="true">
    <main class="win10-desktop__surface" @click="startMenuOpen = false">
      <button
        v-for="app in apps"
        :key="app.id"
        type="button"
        class="desktop-icon"
        @dblclick.stop="openApp(app.id)"
      >
        <span class="desktop-icon__glyph">{{ app.icon }}</span>
        <span>{{ app.title }}</span>
      </button>
    </main>

    <template #dock="{ windows, items, setDockTarget }">
      <Win10Dock
        :windows="windows"
        :items="items"
        @dock-target-change="setDockTarget"
      >
        <template #left>
          <button type="button" class="taskbar-start" @click.stop="toggleStartMenu">
            <span>⊞</span>
          </button>

          <div v-if="startMenuOpen" class="start-menu">
            <button
              v-for="app in apps"
              :key="app.id"
              type="button"
              class="start-menu__app"
              @click="openApp(app.id)"
            >
              <span>{{ app.icon }}</span>
              <strong>{{ app.title }}</strong>
            </button>
          </div>
        </template>

        <template #right>
          <button type="button" class="taskbar-command" title="隐藏全部" @click="windows.hideAll()">隐藏</button>
          <button type="button" class="taskbar-command" title="显示全部" @click="windows.showAll()">显示</button>
          <div class="taskbar-tray">
            <span>网络</span>
            <span>音量</span>
            <time>{{ clockText }}</time>
          </div>
        </template>
      </Win10Dock>
    </template>
  </WindowsDesktop>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCurrentWindow, WindowsDesktop, Win10Dock } from 'vue3-windows'
import type { WindowsDesktopRef, WindowsItem } from 'vue3-windows'

type AppId = 'explorer' | 'notes' | 'settings'

type AppMeta = {
  id: AppId
  title: string
  icon: string
  width: number
  height: number
}

const apps: AppMeta[] = [
  { id: 'explorer', title: '文件资源管理器', icon: '▣', width: 760, height: 480 },
  { id: 'notes', title: '便笺', icon: '▤', width: 460, height: 360 },
  { id: 'settings', title: '设置', icon: '⚙', width: 560, height: 420 },
]

const desktopRef = ref<WindowsDesktopRef | null>(null)
const startMenuOpen = ref(false)
const now = ref(new Date())

let clockTimer: ReturnType<typeof window.setInterval> | null = null

const clockText = computed(() =>
  now.value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }),
)

const ExplorerWindow = createWindowContent('快速访问', [
  ['桌面', '此电脑', '下载'],
  ['文档', '图片', '视频'],
  ['项目', '示例', '临时文件'],
])

const NotesWindow = createWindowContent('今日事项', [
  ['完善窗口 API', '检查 dock 自定义能力', '验证隐藏与还原'],
  ['记录一个真实桌面示例'],
])

const SettingsWindow = createWindowContent('系统设置', [
  ['显示', '声音', '通知'],
  ['个性化', '应用', '账户'],
  ['时间和语言', '隐私', '更新'],
])

onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (clockTimer) {
    window.clearInterval(clockTimer)
    clockTimer = null
  }
})

function toggleStartMenu() {
  startMenuOpen.value = !startMenuOpen.value
}

function openApp(id: AppId) {
  const app = apps.find((item) => item.id === id)
  if (!app) {
    return
  }

  startMenuOpen.value = false
  const existing = desktopRef.value?.get(app.id)
  if (existing) {
    desktopRef.value?.moveTop(existing.id)
    return
  }

  desktopRef.value?.create({
    id: app.id,
    title: app.title,
    component: getAppComponent(id),
    width: app.width,
    height: app.height,
    outsideClickBehavior: 'none',
  })
}

function getAppComponent(id: AppId) {
  if (id === 'notes') {
    return NotesWindow
  }

  if (id === 'settings') {
    return SettingsWindow
  }

  return ExplorerWindow
}

function createWindowContent(title: string, groups: string[][]) {
  return defineComponent({
    name: `${title}Window`,
    props: {
      item: {
        type: Object as () => WindowsItem,
        required: true,
      },
    },
    setup(props) {
      const currentWindow = useCurrentWindow()

      return () =>
        h('div', { class: 'win-window' }, [
          h('div', { class: 'win-window__toolbar' }, [
            h('strong', title),
            h('div', { class: 'win-window__actions' }, [
              h('button', { type: 'button', onClick: currentWindow.minimize }, '最小化'),
              h('button', { type: 'button', onClick: currentWindow.maximize }, '最大化'),
              h('button', { type: 'button', onClick: currentWindow.moveTop }, '置顶'),
              h('button', { type: 'button', onClick: currentWindow.close }, '关闭'),
            ]),
          ]),
          h('div', { class: 'win-window__grid' }, groups.flatMap((group) =>
            group.map((label) =>
              h('button', { type: 'button', class: 'win-window__tile' }, [
                h('span', label.slice(0, 1)),
                h('strong', label),
                h('small', props.item.title),
              ]),
            ),
          )),
        ])
    },
  })
}
</script>

<style scoped>
.win10-desktop {
  height: calc(100vh - var(--vp-nav-height, 0px));
  min-height: 620px;
  background:
    linear-gradient(135deg, rgba(0, 120, 215, 0.96), rgba(0, 74, 128, 0.88)),
    radial-gradient(circle at 80% 15%, rgba(255, 255, 255, 0.24), transparent 26%);
  color: #fff;
}

.win10-desktop__surface {
  display: flex;
  align-content: flex-start;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 18px;
  height: calc(100% - 48px);
  padding: 24px;
}

.desktop-icon {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 88px;
  min-height: 88px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.36);
  cursor: default;
}

.desktop-icon:hover {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.12);
}

.desktop-icon__glyph {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.88);
  color: #0078d4;
  font-size: 24px;
  text-shadow: none;
}

.taskbar-start,
.taskbar-command {
  height: 48px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #fff;
  cursor: default;
}

.taskbar-start {
  width: 48px;
  font-size: 22px;
}

.taskbar-command {
  padding: 0 12px;
  font-size: 12px;
}

.taskbar-start:hover,
.taskbar-command:hover {
  background: rgba(255, 255, 255, 0.14);
}

.start-menu {
  position: absolute;
  left: 0;
  bottom: 48px;
  display: grid;
  gap: 6px;
  width: 300px;
  padding: 12px;
  background: rgba(20, 20, 20, 0.94);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.34);
}

.start-menu__app {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 42px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: default;
}

.start-menu__app:hover {
  background: rgba(255, 255, 255, 0.12);
}

.taskbar-tray {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 12px;
  color: #fff;
  font-size: 12px;
}

:global(.win-window) {
  display: grid;
  gap: 16px;
}

:global(.win-window__toolbar) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

:global(.win-window__actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:global(.win-window__actions button) {
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 4px;
  background: #fff;
  color: #334155;
}

:global(.win-window__grid) {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

:global(.win-window__tile) {
  display: grid;
  gap: 6px;
  min-height: 96px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 6px;
  background: #f8fafc;
  color: #0f172a;
  text-align: left;
}

:global(.win-window__tile span) {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: #0078d4;
  color: #fff;
}

:global(.win-window__tile small) {
  color: #64748b;
}

@media (max-width: 720px) {
  .win10-desktop {
    min-height: 700px;
  }

  .taskbar-command,
  .taskbar-tray span {
    display: none;
  }

  :global(.win-window__grid) {
    grid-template-columns: 1fr;
  }
}
</style>
