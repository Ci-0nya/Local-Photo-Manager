import { create } from 'zustand'

interface BackgroundState {
  hasImage: boolean
  opacity: number
  rev: number
  load: () => Promise<void>
  setOpacity: (v: number) => Promise<void>
  applyImage: (path: string) => Promise<void>
  clear: () => Promise<void>
}

export const useBackgroundStore = create<BackgroundState>((set) => ({
  hasImage: false,
  opacity: 1,
  rev: 0,
  load: async () => {
    const bg = await window.api.getBackground()
    set({ hasImage: bg.image != null, opacity: bg.opacity })
  },
  setOpacity: async (v) => {
    const opacity = Math.min(1, Math.max(0, v))
    await window.api.setBackgroundOpacity(opacity)
    set({ opacity })
  },
  applyImage: async (path) => {
    const bg = await window.api.applyBackground(path)
    set((s) => ({ hasImage: bg.image != null, opacity: bg.opacity, rev: s.rev + 1 }))
  },
  clear: async () => {
    await window.api.clearBackground()
    set((s) => ({ hasImage: false, rev: s.rev + 1 }))
  }
}))