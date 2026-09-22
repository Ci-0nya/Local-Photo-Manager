import type { PhotoMindApi } from '@shared/ipc'

declare global {
  interface Window {
    api: PhotoMindApi
    getPathForFile(file: File): string
  }
}

export {}