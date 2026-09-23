import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { CHANNELS } from '../shared/ipc'
import type { PhotoMindApi, SaveDirProgress } from '../shared/ipc'

const api: PhotoMindApi = {
  pickImages: () => ipcRenderer.invoke(CHANNELS.pickImages),
  pickFolderAndImport: () => ipcRenderer.invoke(CHANNELS.pickFolderAndImport),
  importPhotos: (paths) => ipcRenderer.invoke(CHANNELS.importPhotos, paths),
  getPhotos: () => ipcRenderer.invoke(CHANNELS.getPhotos),
  markEdited: (id) => ipcRenderer.invoke(CHANNELS.markEdited, id),
  setPhotoTags: (id, tags) => ipcRenderer.invoke(CHANNELS.setPhotoTags, id, tags),
  setRating: (id, rating) => ipcRenderer.invoke(CHANNELS.setRating, id, rating),
  setPhotoName: (id, name) => ipcRenderer.invoke(CHANNELS.setPhotoName, id, name),
  deletePhotos: (ids, deleteFiles) => ipcRenderer.invoke(CHANNELS.deletePhotos, ids, deleteFiles),
  readExif: (photoId) => ipcRenderer.invoke(CHANNELS.readExif, photoId),
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
  clearCanvas: () => ipcRenderer.invoke(CHANNELS.clearCanvas),
  getSaveDir: () => ipcRenderer.invoke(CHANNELS.getSaveDir),
  pickSaveDir: () => ipcRenderer.invoke(CHANNELS.pickSaveDir),
  validateSaveDir: (path) => ipcRenderer.invoke(CHANNELS.validateSaveDir, path),
  migrateSaveDir: (path) => ipcRenderer.invoke(CHANNELS.migrateSaveDir, path),
  onSaveDirProgress: (cb) => {
    const handler = (_e: unknown, p: SaveDirProgress) => cb(p)
    ipcRenderer.on(CHANNELS.saveDirProgress, handler)
    return () => ipcRenderer.removeListener(CHANNELS.saveDirProgress, handler)
  },
  saveMindLibrary: (name, snapshot) => ipcRenderer.invoke(CHANNELS.saveMindLibrary, name, snapshot),
  listMindLibrary: () => ipcRenderer.invoke(CHANNELS.listMindLibrary),
  deleteMindLibrary: (ids) => ipcRenderer.invoke(CHANNELS.deleteMindLibrary, ids),
  getBackground: () => ipcRenderer.invoke(CHANNELS.getBackground),
  pickBackground: () => ipcRenderer.invoke(CHANNELS.pickBackground),
  applyBackground: (path) => ipcRenderer.invoke(CHANNELS.applyBackground, path),
  setBackgroundOpacity: (opacity) => ipcRenderer.invoke(CHANNELS.setBackgroundOpacity, opacity),
  clearBackground: () => ipcRenderer.invoke(CHANNELS.clearBackground)
}

contextBridge.exposeInMainWorld('api', api)
contextBridge.exposeInMainWorld('getPathForFile', (file: File) => webUtils.getPathForFile(file))