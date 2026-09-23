import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import { readdirSync, existsSync, statSync, copyFileSync, unlinkSync, mkdirSync } from 'fs'
import { extname, join, resolve, relative, isAbsolute } from 'path'
import { CHANNELS } from '../shared/ipc'
import type { MapEdgePatch, MapNodePatch, MindCanvasSnapshot } from '../shared/types'
import * as photoRepo from './photoRepo'
import * as mapRepo from './mapRepo'
import * as mindLibraryRepo from './mindLibraryRepo'
import { readExif } from './exif'
import { getSaveDir, persistSaveDir, getBackgroundImagePath, getBackgroundOpacity, setBackgroundImage, setBackgroundOpacity } from './settings'

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])
const MAX_IMPORT = 10

function filterImages(paths: unknown): string[] {
  if (!Array.isArray(paths)) return []
  return paths.filter((p): p is string => typeof p === 'string' && SUPPORTED.has(extname(p).toLowerCase())).slice(0, MAX_IMPORT)
}

// 递归收集文件夹内的图片（不限制数量）
function collectImages(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const en of entries) {
      const p = join(d, en.name)
      if (en.isDirectory()) walk(p)
      else if (en.isFile() && SUPPORTED.has(extname(p).toLowerCase())) out.push(p)
    }
  }
  walk(dir)
  return out
}

// 标准化整理渲染进程传入的快照，过滤非法字段（防御性边界）
function sanitizeSnapshot(raw: unknown): MindCanvasSnapshot {
  const nodes: MindCanvasSnapshot['nodes'] = []
  const edges: MindCanvasSnapshot['edges'] = []
  if (raw && typeof raw === 'object') {
    const o = raw as { nodes?: unknown; edges?: unknown }
    if (Array.isArray(o.nodes)) {
      for (const n of o.nodes) {
        if (!n || typeof n !== 'object') continue
        const nn = n as Record<string, unknown>
        nodes.push({
          photoId: Number(nn.photoId) || 0,
          name: typeof nn.name === 'string' ? nn.name : '',
          x: Number(nn.x) || 0,
          y: Number(nn.y) || 0,
          width: Number(nn.width) || 180,
          height: Number(nn.height) || 180
        })
      }
    }
    if (Array.isArray(o.edges)) {
      for (const e of o.edges) {
        if (!e || typeof e !== 'object') continue
        const ee = e as Record<string, unknown>
        edges.push({
          source: Number(ee.source) || 0,
          target: Number(ee.target) || 0,
          label: typeof ee.label === 'string' ? ee.label : null
        })
      }
    }
  }
  return { nodes, edges }
}

export function registerIpcHandlers(deps: { db: DatabaseSync; thumbDir: string; kushotDir: string; backgroundDir: string }): void {
  ipcMain.handle(CHANNELS.pickImages, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: '选择照片（最多 10 张）',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle(CHANNELS.importPhotos, (_e, paths: unknown) =>
    photoRepo.importPhotoFiles(deps.db, getSaveDir(), filterImages(paths))
  )

  ipcMain.handle(CHANNELS.pickFolderAndImport, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: '选择文件夹',
      properties: ['openDirectory']
    })
    if (result.canceled || !result.filePaths.length) return { photos: [], errors: [] }
    return photoRepo.importPhotoFiles(deps.db, getSaveDir(), collectImages(result.filePaths[0]))
  })

  ipcMain.handle(CHANNELS.getPhotos, () => photoRepo.listPhotos(deps.db))

  ipcMain.handle(CHANNELS.markEdited, (_e, id: number) => photoRepo.markEdited(deps.db, id))

  ipcMain.handle(CHANNELS.setPhotoTags, (_e, id: number, tags: string[]) =>
    photoRepo.setPhotoTags(deps.db, id, Array.isArray(tags) ? tags.map(String) : [])
  )

  ipcMain.handle(CHANNELS.setRating, (_e, id: number, rating: number) =>
    photoRepo.setRating(deps.db, id, Math.min(5, Math.max(0, Math.round(Number(rating) || 0))))
  )

  ipcMain.handle(CHANNELS.setPhotoName, (_e, id: number, name: string) =>
    photoRepo.setPhotoName(deps.db, id, typeof name === 'string' ? name : '')
  )

  ipcMain.handle(CHANNELS.deletePhotos, (_e, ids: unknown, deleteFiles: unknown) =>
    photoRepo.deletePhotos(
      deps.db,
      Array.isArray(ids) ? ids.filter((x): x is number => typeof x === 'number') : [],
      deleteFiles === true,
      getSaveDir()
    )
  )

  ipcMain.handle(CHANNELS.readExif, (_e, photoId: number) => {
    const photo = photoRepo.getById(deps.db, photoId)
    return photo ? readExif(photo.path) : {}
  })

  // 联想画布
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

  ipcMain.handle(CHANNELS.clearCanvas, () => {
    const map = mapRepo.getOrCreateDefaultMap(deps.db)
    mapRepo.clearMapContents(deps.db, map.id)
  })

  // —— savepicture 文件夹位置设置 ——

  ipcMain.handle(CHANNELS.getSaveDir, () => getSaveDir())

  ipcMain.handle(CHANNELS.pickSaveDir, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: '选择 savepicture 文件夹位置',
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0]
  })

  // 校验目标路径：非空、非当前、不可位于当前 savepicture 内部、可写
  const validateTarget = (path: unknown): { ok: boolean; reason?: string } => {
    if (typeof path !== 'string' || !path.trim()) return { ok: false, reason: '路径为空' }
    const target = resolve(path.trim())
    const current = resolve(getSaveDir())
    if (target === current) return { ok: false, reason: '新路径与当前路径相同' }
    const rel = relative(current, target)
    if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
      return { ok: false, reason: '新路径不能位于当前 savepicture 文件夹内部（会随旧目录一并删除）' }
    }
    if (existsSync(target) && !statSync(target).isDirectory()) {
      return { ok: false, reason: '目标路径已存在但不是文件夹' }
    }
    if (!photoRepo.isWritableDir(target)) {
      return { ok: false, reason: '路径不可写或无法创建（可能存在权限不足或存储介质不可用）' }
    }
    return { ok: true }
  }

  ipcMain.handle(CHANNELS.validateSaveDir, (_e, path: unknown) => validateTarget(path))

  ipcMain.handle(CHANNELS.migrateSaveDir, (event, path: unknown) => {
    const check = validateTarget(path)
    if (!check.ok) return { moved: 0, errors: [check.reason ?? '路径无效'] }
    const newDir = resolve((path as string).trim())
    const oldDir = getSaveDir()
    const res = photoRepo.migrateSaveDir(deps.db, oldDir, newDir, (current, total, bytes, totalBytes, name) => {
      event.sender.send(CHANNELS.saveDirProgress, { current, total, bytes, totalBytes, name })
    })
    if (res.errors.length === 0) persistSaveDir(newDir)
    return res
  })

  // —— 联想库 ——
  ipcMain.handle(CHANNELS.saveMindLibrary, async (_e, name: unknown, snapshot: unknown) => {
    const displayName =
      typeof name === 'string' && name.trim() ? name.trim() : `联想画布 ${new Date().toLocaleString('zh-CN')}`
    return await mindLibraryRepo.saveLibrary(deps.db, displayName, sanitizeSnapshot(snapshot), deps.thumbDir, deps.kushotDir)
  })

  ipcMain.handle(CHANNELS.listMindLibrary, () => mindLibraryRepo.listLibrary(deps.db, deps.kushotDir))

  ipcMain.handle(CHANNELS.deleteMindLibrary, async (_e, ids: unknown) => {
    const list = Array.isArray(ids) ? ids.filter((x): x is number => typeof x === 'number') : []
    await mindLibraryRepo.deleteLibrary(deps.db, list, deps.kushotDir)
  })

  // —— 自定义背景图 ——
  ipcMain.handle(CHANNELS.getBackground, () => ({
    image: getBackgroundImagePath(),
    opacity: getBackgroundOpacity()
  }))

  ipcMain.handle(CHANNELS.pickBackground, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: '选择背景图片',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }]
    })
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0]
  })

  ipcMain.handle(CHANNELS.applyBackground, (_e, path: unknown) => {
    if (typeof path === 'string' && path.trim()) {
      try {
        const ext = extname(path).toLowerCase() || '.png'
        mkdirSync(deps.backgroundDir, { recursive: true })
        for (const f of readdirSync(deps.backgroundDir)) {
          if (f.startsWith('custom-bg')) unlinkSync(join(deps.backgroundDir, f))
        }
        copyFileSync(path, join(deps.backgroundDir, `custom-bg${ext}`))
        setBackgroundImage(join(deps.backgroundDir, `custom-bg${ext}`))
      } catch {
        // 复制失败则保留原背景，避免丢失
      }
    }
    return { image: getBackgroundImagePath(), opacity: getBackgroundOpacity() }
  })

  ipcMain.handle(CHANNELS.setBackgroundOpacity, (_e, opacity: unknown) => {
    setBackgroundOpacity(typeof opacity === 'number' ? opacity : 1)
  })

  ipcMain.handle(CHANNELS.clearBackground, () => {
    const old = getBackgroundImagePath()
    if (old) {
      try {
        unlinkSync(old)
      } catch {
        /* 忽略 */
      }
    }
    setBackgroundImage(null)
  })
}