import { create } from 'zustand'
import type { Photo } from '@shared/types'

interface EditingState {
  queue: Photo[]
  index: number
  mode: 'process' | 'batch'
}

interface LibraryState {
  photos: Photo[]
  loading: boolean
  importing: boolean
  lastImported: Photo[]
  editor: EditingState | null
  loadLibrary: () => Promise<void>
  importFromDialog: () => Promise<void>
  importFolder: () => Promise<void>
  importPaths: (paths: string[]) => Promise<void>
  startEditing: (queue: Photo[]) => void
  startBatchEditing: (queue: Photo[]) => void
  finishCurrent: () => Promise<void>
  takeBreak: () => void
  closeEditor: () => void
  editorPrev: () => void
  editorNext: () => void
  setPhotoTags: (id: number, tags: string[]) => Promise<void>
  setRating: (id: number, rating: number) => Promise<void>
  setPhotoName: (id: number, name: string) => Promise<void>
  deletePhotos: (ids: number[], deleteFiles: boolean) => Promise<{ fileErrors: number }>
}

// 同步更新编辑队列中对应照片的字段，保证「上一张/下一张」回看时已编辑信息不丢失
function patchEditorPhoto(editor: EditingState, id: number, patch: Partial<Photo>): EditingState {
  return {
    ...editor,
    queue: editor.queue.map((p) => (p.id === id ? { ...p, ...patch } : p))
  }
}

export const useLibraryStore = create<LibraryState>((set, get) => {
  const refresh = async () => set({ photos: await window.api.getPhotos() })

  return {
    photos: [],
    loading: false,
    importing: false,
    lastImported: [],
    editor: null,

    loadLibrary: async () => {
      set({ loading: true })
      try {
        await refresh()
      } finally {
        set({ loading: false })
      }
    },

    importFromDialog: async () => {
      set({ importing: true })
      try {
        const paths = await window.api.pickImages()
        if (paths.length) {
          const { photos, errors } = await window.api.importPhotos(paths)
          await refresh()
          set({ lastImported: photos })
          if (errors.length) window.alert(`导入完成：成功 ${photos.length} 张，失败 ${errors.length} 张。\n${errors.slice(0, 5).join('\n')}`)
        }
      } finally {
        set({ importing: false })
      }
    },

    importFolder: async () => {
      set({ importing: true })
      try {
        const { photos, errors } = await window.api.pickFolderAndImport()
        await refresh()
        set({ lastImported: photos })
        if (errors.length) window.alert(`导入完成：成功 ${photos.length} 张，失败 ${errors.length} 张。\n${errors.slice(0, 5).join('\n')}`)
      } finally {
        set({ importing: false })
      }
    },

    importPaths: async (paths) => {
      if (!paths.length) return
      set({ importing: true })
      try {
        const { photos, errors } = await window.api.importPhotos(paths)
        await refresh()
        set({ lastImported: photos })
        if (errors.length) window.alert(`导入完成：成功 ${photos.length} 张，失败 ${errors.length} 张。\n${errors.slice(0, 5).join('\n')}`)
      } finally {
        set({ importing: false })
      }
    },

    startEditing: (queue) => set({ editor: queue.length ? { queue, index: 0, mode: 'process' } : null, lastImported: [] }),

    startBatchEditing: (queue) => set({ editor: queue.length ? { queue, index: 0, mode: 'batch' } : null }),

    finishCurrent: async () => {
      const { editor } = get()
      if (!editor) return
      const current = editor.queue[editor.index]
      if (!current) return
      await window.api.markEdited(current.id)
      await refresh()
      const next = editor.index + 1
      if (next >= editor.queue.length) set({ editor: null })
      else set({ editor: { queue: editor.queue, index: next, mode: 'process' } })
    },

    takeBreak: () => set({ editor: null }),

    closeEditor: () => set({ editor: null }),

    editorPrev: () => {
      const { editor } = get()
      if (!editor || editor.index === 0) return
      set({ editor: { ...editor, index: editor.index - 1 } })
    },

    editorNext: () => {
      const { editor } = get()
      if (!editor || editor.index >= editor.queue.length - 1) return
      set({ editor: { ...editor, index: editor.index + 1 } })
    },

    setPhotoTags: async (id, tags) => {
      await window.api.setPhotoTags(id, tags)
      await refresh()
      set((s) => (s.editor ? { editor: patchEditorPhoto(s.editor, id, { tags }) } : {}))
    },

    setRating: async (id, rating) => {
      await window.api.setRating(id, rating)
      await refresh()
      set((s) => (s.editor ? { editor: patchEditorPhoto(s.editor, id, { rating }) } : {}))
    },

    setPhotoName: async (id, name) => {
      await window.api.setPhotoName(id, name)
      await refresh()
      set((s) => (s.editor ? { editor: patchEditorPhoto(s.editor, id, { name }) } : {}))
    },

    deletePhotos: async (ids, deleteFiles) => {
      const res = await window.api.deletePhotos(ids, deleteFiles)
      await refresh()
      return res
    }
  }
})