import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import { CHANNELS } from '../shared/ipc'
import type { MapEdgePatch, MapNodePatch } from '../shared/types'
import { scanDirectory } from './scanner'
import * as photoRepo from './photoRepo'
import * as categoryRepo from './categoryRepo'
import * as photoCategoryRepo from './photoCategoryRepo'
import * as libraryRepo from './libraryRepo'
import * as mapRepo from './mapRepo'
import * as folderRepo from './folderRepo'
import * as albumRepo from './albumRepo'
import * as settingsRepo from './settingsRepo'

export function registerIpcHandlers(deps: { db: DatabaseSync }): void {
  ipcMain.handle(CHANNELS.importFolder, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: '选择照片文件夹',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, dir: '', added: 0, skipped: 0, total: 0 }
    }
    const dir = result.filePaths[0]
    const scan = await scanDirectory(dir)
    const folderIdByDir = folderRepo.ensureFolders(deps.db, scan.dirs)
    const { added, skipped } = photoRepo.upsertPhotos(deps.db, scan.photos, folderIdByDir)
    return { canceled: false, dir, added, skipped, total: scan.photos.length }
  })

  ipcMain.handle(CHANNELS.getLibrary, () => libraryRepo.getLibrary(deps.db))

  ipcMain.handle(CHANNELS.createCategory, (_e, name: string, color: string) =>
    categoryRepo.createCategory(deps.db, name, color)
  )
  ipcMain.handle(CHANNELS.renameCategory, (_e, id: number, name: string) =>
    categoryRepo.renameCategory(deps.db, id, name)
  )
  ipcMain.handle(CHANNELS.deleteCategory, (_e, id: number) => categoryRepo.deleteCategory(deps.db, id))
  ipcMain.handle(CHANNELS.setCategoryColor, (_e, id: number, color: string) =>
    categoryRepo.setCategoryColor(deps.db, id, color)
  )
  ipcMain.handle(CHANNELS.moveCategory, (_e, id: number, direction: -1 | 1) =>
    categoryRepo.moveCategory(deps.db, id, direction)
  )

  ipcMain.handle(CHANNELS.addPhotoCategory, (_e, photoId: number, categoryId: number) =>
    photoCategoryRepo.addPhotoCategory(deps.db, photoId, categoryId)
  )
  ipcMain.handle(CHANNELS.removePhotoCategory, (_e, photoId: number, categoryId: number) =>
    photoCategoryRepo.removePhotoCategory(deps.db, photoId, categoryId)
  )

  ipcMain.handle(CHANNELS.getCanvasNodes, () => {
    const map = mapRepo.getOrCreateDefaultMap(deps.db)
    return mapRepo.listMapNodes(deps.db, map.id)
  })
  ipcMain.handle(
    CHANNELS.createCanvasNode,
    (_e, photoId: number, x: number, y: number, width: number, height: number, title: string | null) => {
      const map = mapRepo.getOrCreateDefaultMap(deps.db)
      return mapRepo.createMapNode(deps.db, map.id, photoId, x, y, width, height, title)
    }
  )
  ipcMain.handle(CHANNELS.updateCanvasNode, (_e, id: number, patch: MapNodePatch) =>
    mapRepo.updateMapNode(deps.db, id, patch)
  )
  ipcMain.handle(CHANNELS.deleteCanvasNode, (_e, id: number) => mapRepo.deleteMapNode(deps.db, id))

  ipcMain.handle(CHANNELS.getCanvasEdges, () => {
    const map = mapRepo.getOrCreateDefaultMap(deps.db)
    return mapRepo.listMapEdges(deps.db, map.id)
  })
  ipcMain.handle(CHANNELS.createCanvasEdge, (_e, sourceNodeId: number, targetNodeId: number, label: string | null) => {
    const map = mapRepo.getOrCreateDefaultMap(deps.db)
    return mapRepo.createMapEdge(deps.db, map.id, sourceNodeId, targetNodeId, label)
  })
  ipcMain.handle(CHANNELS.updateCanvasEdge, (_e, id: number, patch: MapEdgePatch) =>
    mapRepo.updateMapEdge(deps.db, id, patch)
  )
  ipcMain.handle(CHANNELS.deleteCanvasEdge, (_e, id: number) => mapRepo.deleteMapEdge(deps.db, id))

  ipcMain.handle(CHANNELS.listAlbums, () => albumRepo.listAlbums(deps.db))
  ipcMain.handle(CHANNELS.getAlbumPhotos, (_e, albumKey: string) => albumRepo.getAlbumPhotos(deps.db, albumKey))
  ipcMain.handle(CHANNELS.getSetting, (_e, key: string) => settingsRepo.getSetting(deps.db, key))
  ipcMain.handle(CHANNELS.setSetting, (_e, key: string, value: string) => settingsRepo.setSetting(deps.db, key, value))
}