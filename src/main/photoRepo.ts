import type { DatabaseSync } from 'node:sqlite'
import type { Photo, ScannedPhoto } from '../shared/types'

interface Row {
  id: number
  path: string
  filename: string
  mtimeMs: number
  fileSize: number
  createdAt: number
}

const SELECT = `SELECT id, path, filename, mtime_ms AS mtimeMs, file_size AS fileSize, created_at AS createdAt FROM photos`

function toPhoto(row: Row): Photo {
  return {
    id: row.id,
    path: row.path,
    filename: row.filename,
    mtimeMs: row.mtimeMs,
    fileSize: row.fileSize,
    createdAt: row.createdAt
  }
}

export function listPhotos(db: DatabaseSync): Photo[] {
  const rows = db.prepare(`${SELECT} ORDER BY created_at ASC, id ASC`).all() as unknown as Row[]
  return rows.map(toPhoto)
}

export function getById(db: DatabaseSync, id: number): Photo | undefined {
  const row = db.prepare(`${SELECT} WHERE id = ?`).get(id) as Row | undefined
  return row ? toPhoto(row) : undefined
}

export function countPhotos(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS c FROM photos').get() as { c: number }
  return row.c
}

// 按 path 去重：已存在则更新 mtime/size/所属文件夹，否则插入新记录
export function upsertPhotos(
  db: DatabaseSync,
  scanned: ScannedPhoto[],
  folderIdByDir: Map<string, number>
): { added: number; skipped: number } {
  const insert = db.prepare(
    'INSERT INTO photos (path, filename, mtime_ms, file_size, created_at, folder_id) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const update = db.prepare('UPDATE photos SET mtime_ms = ?, file_size = ?, filename = ?, folder_id = ? WHERE path = ?')
  const find = db.prepare('SELECT id FROM photos WHERE path = ?')

  let added = 0
  let skipped = 0

  db.exec('BEGIN')
  try {
    for (const p of scanned) {
      const folderId = folderIdByDir.get(p.dirPath) ?? null
      const existing = find.get(p.path)
      if (existing) {
        update.run(p.mtimeMs, p.fileSize, p.filename, folderId, p.path)
        skipped++
      } else {
        insert.run(p.path, p.filename, p.mtimeMs, p.fileSize, Date.now(), folderId)
        added++
      }
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return { added, skipped }
}