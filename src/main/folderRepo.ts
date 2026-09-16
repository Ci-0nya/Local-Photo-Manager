import type { DatabaseSync } from 'node:sqlite'
import { basename, dirname, normalize } from 'path'
import type { Folder } from '../shared/types'

const SELECT = `SELECT id, name, path, parent_id AS parentId, created_at AS createdAt FROM folders`

function getByPath(db: DatabaseSync, normPath: string): Folder | undefined {
  return db.prepare(`${SELECT} WHERE path = ?`).get(normPath) as unknown as Folder | undefined
}

export function listFolders(db: DatabaseSync): Folder[] {
  return db.prepare(`${SELECT} ORDER BY id ASC`).all() as unknown as Folder[]
}

function createFolder(db: DatabaseSync, name: string, path: string, parentId: number | null): number {
  const info = db
    .prepare('INSERT INTO folders (name, path, parent_id, created_at) VALUES (?, ?, ?, ?)')
    .run(name, path, parentId, Date.now())
  return Number(info.lastInsertRowid)
}

function depth(p: string): number {
  return normalize(p).split(/[\\/]/).filter(Boolean).length
}

// 确保 dirs 对应的文件夹都已存在（含父子关系），返回 rawDir -> folderId 映射
export function ensureFolders(db: DatabaseSync, dirs: string[]): Map<string, number> {
  const byNorm = new Map<string, number>()
  for (const f of listFolders(db)) byNorm.set(normalize(f.path), f.id)

  const map = new Map<string, number>()
  const sorted = [...new Set(dirs)].sort((a, b) => depth(a) - depth(b))

  for (const raw of sorted) {
    const norm = normalize(raw)
    let id = byNorm.get(norm)
    if (id === undefined) {
      const parentNorm = normalize(dirname(norm))
      const parentId = parentNorm !== norm ? (byNorm.get(parentNorm) ?? null) : null
      id = createFolder(db, basename(norm) || norm, norm, parentId)
      byNorm.set(norm, id)
    }
    map.set(raw, id)
  }
  return map
}

// 返回某文件夹及其所有子孙文件夹的 id
export function getDescendantIds(folders: Folder[], rootId: number): number[] {
  const children = new Map<number, number[]>()
  for (const f of folders) {
    if (f.parentId != null) {
      const list = children.get(f.parentId)
      if (list) list.push(f.id)
      else children.set(f.parentId, [f.id])
    }
  }
  const result: number[] = []
  const stack = [rootId]
  while (stack.length) {
    const cur = stack.pop()!
    result.push(cur)
    for (const c of children.get(cur) ?? []) stack.push(c)
  }
  return result
}