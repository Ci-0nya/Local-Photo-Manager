import { create } from 'zustand'

export type ThemeColor = 'white' | 'black'

const STORAGE_KEY = 'photomind.theme'
const THEMES: ThemeColor[] = ['white', 'black']

function readStored(): ThemeColor {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && (THEMES as string[]).includes(v)) return v as ThemeColor
  } catch {
    /* ignore */
  }
  return 'white'
}

function applyTheme(theme: ThemeColor): void {
  document.documentElement.setAttribute('data-theme', theme)
}

interface ThemeState {
  theme: ThemeColor
  setTheme: (theme: ThemeColor) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readStored(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
    const root = document.documentElement
    // 切换期间增加临时 class 触发全局颜色平滑过渡（350ms 缓入缓出）
    root.classList.add('theming')
    applyTheme(theme)
    window.setTimeout(() => root.classList.remove('theming'), 360)
    set({ theme })
  }
}))

// 初始化：应用已保存的主题（无重启即时生效）
applyTheme(useThemeStore.getState().theme)