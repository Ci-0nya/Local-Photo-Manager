import type { PhotoMindApi } from '@shared/ipc'

declare global {
  interface Window {
    api: PhotoMindApi
  }
}

export {}