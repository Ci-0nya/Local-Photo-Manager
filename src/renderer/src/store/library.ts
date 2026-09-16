import { create } from 'zustand'
import type { Album, Category, ImportResult, PhotoWithCategories } from '@shared/types'

const ALBUM_COLUMNS_KEY = 'album_columns'

interface LibraryState {
  photos: PhotoWithCategories[]
  categories: Category[]
  albums: Album[]
  gridColumns: number
  loading: boolean
  importing: boolean
  lastResult: ImportResult | null
  loadLibrary: () => Promise<void>
  loadGridColumns: () => Promise<void>
  setGridColumns: (n: number) => Promise<void>
  importFolder: () => Promise<void>
  createCategory: (name: string, color: string) => Promise<void>
  renameCategory: (id: number, name: string) => Promise<void>
  deleteCategory: (id: number) => Promise<void>
  setCategoryColor: (id: number, color: string) => Promise<void>
  moveCategory: (id: number, direction: -1 | 1) => Promise<void>
  togglePhotoCategory: (photoId: number, categoryId: number) => Promise<void>
}

export const useLibraryStore = create<LibraryState>((set, get) => {
  const refresh = async () => {
    const [data, albums] = await Promise.all([window.api.getLibrary(), window.api.listAlbums()])
    set({ photos: data.photos, categories: data.categories, albums })
  }

  return {
    photos: [],
    categories: [],
    albums: [],
    gridColumns: 6,
    loading: false,
    importing: false,
    lastResult: null,

    loadLibrary: async () => {
      set({ loading: true })
      try {
        await refresh()
      } finally {
        set({ loading: false })
      }
    },

    loadGridColumns: async () => {
      const v = await window.api.getSetting(ALBUM_COLUMNS_KEY)
      if (v === '4' || v === '6' || v === '8') set({ gridColumns: Number(v) })
    },

    setGridColumns: async (n) => {
      set({ gridColumns: n })
      await window.api.setSetting(ALBUM_COLUMNS_KEY, String(n))
    },

    importFolder: async () => {
      set({ importing: true })
      try {
        const result = await window.api.importFolder()
        if (!result.canceled) {
          await refresh()
          set({ lastResult: result })
        }
      } finally {
        set({ importing: false })
      }
    },

    createCategory: async (name, color) => {
      await window.api.createCategory(name, color)
      await refresh()
    },
    renameCategory: async (id, name) => {
      await window.api.renameCategory(id, name)
      await refresh()
    },
    deleteCategory: async (id) => {
      await window.api.deleteCategory(id)
      await refresh()
    },
    setCategoryColor: async (id, color) => {
      await window.api.setCategoryColor(id, color)
      await refresh()
    },
    moveCategory: async (id, direction) => {
      await window.api.moveCategory(id, direction)
      await refresh()
    },
    togglePhotoCategory: async (photoId, categoryId) => {
      const photo = get().photos.find((p) => p.id === photoId)
      if (!photo) return
      if (photo.categoryIds.includes(categoryId)) {
        await window.api.removePhotoCategory(photoId, categoryId)
      } else {
        await window.api.addPhotoCategory(photoId, categoryId)
      }
      await refresh()
    }
  }
})