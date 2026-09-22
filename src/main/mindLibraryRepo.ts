import type { DatabaseSync } from 'node:sqlite'
import { writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { MindCanvasSnapshot, MindLibraryItem } from '../shared/types'
import { exportCanvasImage, sanitizeImageName } from './canvasExport'

interface Row {
  id: number
  name: string
  payload: string
  image_name: string | null
  created_at: number
}

function toItem(row: Row): MindLibraryItem {
  let snapshot: MindCanvasSnapshot = { nodes: [], edges: [] }
  try {
    const parsed = JSON.parse(row.payload)
    if (parsed && typeof parsed === 'object') {
      snapshot = {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : []
      }
    }
  } catch {
    /* 无效数据按空快照处理 */
  }
  return { id: row.id, name: row.name, createdAt: row.created_at, imageName: row.image_name ?? null, snapshot }
}

export async function saveLibrary(
  db: DatabaseSync,
  name: string,
  snapshot: MindCanvasSnapshot,
  thumbDir: string,
  kushotDir: string
): Promise<MindLibraryItem> {
  const imageName = sanitizeImageName(name)

  // 合成并写入画布图片（异步、非阻塞；失败则图片置空，快照仍保存）
  let savedImageName: string | null = null
  try {
    const buf = await exportCanvasImage(db, thumbDir, snapshot)
    if (buf) {
      await writeFile(join(kushotDir, imageName), buf)
      savedImageName = imageName
    }
  } catch {
    savedImageName = null
  }

  const info = db
    .prepare('INSERT INTO mind_library (name, payload, image_name, created_at) VALUES (?, ?, ?, ?)')
    .run(name, JSON.stringify(snapshot), savedImageName, Date.now())
  const row = db
    .prepare('SELECT id, name, payload, image_name, created_at FROM mind_library WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as unknown as Row
  return toItem(row)
}

export function listLibrary(db: DatabaseSync, kushotDir: string): MindLibraryItem[] {
  const rows = db
    .prepare('SELECT id, name, payload, image_name, created_at FROM mind_library ORDER BY created_at DESC, id DESC')
    .all() as unknown as Row[]
  return rows.map(toItem).map((it) => ({
    ...it,
    // 校验图片文件确实存在，避免关联错误
    imageName: it.imageName && existsSync(join(kushotDir, it.imageName)) ? it.imageName : null
  }))
}

export async function deleteLibrary(db: DatabaseSync, ids: number[], kushotDir: string): Promise<void> {
  if (!ids.length) return

  const placeholders = ids.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT image_name FROM mind_library WHERE id IN (${placeholders})`)
    .all(...ids) as unknown as { image_name: string | null }[]

  const del = db.prepare('DELETE FROM mind_library WHERE id = ?')
  db.exec('BEGIN')
  try {
    for (const id of ids) del.run(id)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  // 清理对应的图片文件
  for (const r of rows) {
    if (r.image_name) {
      try {
        await unlink(join(kushotDir, r.image_name))
      } catch {
        /* 文件不存在则忽略 */
      }
    }
  }
}