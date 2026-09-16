import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/ipc'
import type { PhotoMindApi } from '../shared/ipc'

const api: PhotoMindApi = {
  importFolder: () => ipcRenderer.invoke(CHANNELS.importFolder),
  getLibrary: () => ipcRenderer.invoke(CHANNELS.getLibrary),
  createCategory: (name, color) => ipcRenderer.invoke(CHANNELS.createCategory, name, color),
  renameCategory: (id, name) => ipcRenderer.invoke(CHANNELS.renameCategory, id, name),
  deleteCategory: (id) => ipcRenderer.invoke(CHANNELS.deleteCategory, id),
  setCategoryColor: (id, color) => ipcRenderer.invoke(CHANNELS.setCategoryColor, id, color),
  moveCategory: (id, direction) => ipcRenderer.invoke(CHANNELS.moveCategory, id, direction),
  addPhotoCategory: (photoId, categoryId) => ipcRenderer.invoke(CHANNELS.addPhotoCategory, photoId, categoryId),
  removePhotoCategory: (photoId, categoryId) =>
    ipcRenderer.invoke(CHANNELS.removePhotoCategory, photoId, categoryId),
  getCanvasNodes: () => ipcRenderer.invoke(CHANNELS.getCanvasNodes),
  createCanvasNode: (photoId, x, y, width, height, title) =>
    ipcRenderer.invoke(CHANNELS.createCanvasNode, photoId, x, y, width, height, title),
  updateCanvasNode: (id, patch) => ipcRenderer.invoke(CHANNELS.updateCanvasNode, id, patch),
  deleteCanvasNode: (id) => ipcRenderer.invoke(CHANNELS.deleteCanvasNode, id),
  getCanvasEdges: () => ipcRenderer.invoke(CHANNELS.getCanvasEdges),
  createCanvasEdge: (sourceNodeId, targetNodeId, label) =>
    ipcRenderer.invoke(CHANNELS.createCanvasEdge, sourceNodeId, targetNodeId, label),
  updateCanvasEdge: (id, patch) => ipcRenderer.invoke(CHANNELS.updateCanvasEdge, id, patch),
  deleteCanvasEdge: (id) => ipcRenderer.invoke(CHANNELS.deleteCanvasEdge, id),
  listAlbums: () => ipcRenderer.invoke(CHANNELS.listAlbums),
  getAlbumPhotos: (albumKey) => ipcRenderer.invoke(CHANNELS.getAlbumPhotos, albumKey),
  getSetting: (key) => ipcRenderer.invoke(CHANNELS.getSetting, key),
  setSetting: (key, value) => ipcRenderer.invoke(CHANNELS.setSetting, key, value)
}

contextBridge.exposeInMainWorld('api', api)