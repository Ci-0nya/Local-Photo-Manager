import type { DatabaseSync } from 'node:sqlite'
import { statSync, rmSync, existsSync, copyFileSync, mkdirSync, readdirSync, writeFileSync, utimesSync } from 'fs'
import { basename, extname, join, sep, dirname } from 'path'
import type { Photo } from '../shared/types'

interface Row {
  id: number
  path: string
  filename: string
  mtimeMs: number
  fileSize: number
  createdAt: number
  edited: number
  tags: string | null
  rating: number
  name: string | null
  editedAt: number | null
}

const SELECT = `SELECT id, path, filename, mtime_ms AS mtimeMs, file_size AS fileSize, created_at AS createdAt, edited, tags, rating, name, edited_at AS editedAt FROM photos`

function parseTags(s: string | null | undefined): string[] {
  if (!s) return []
  try {
    const a = JSON.parse(s)
    return Array.isArray(a) ? a.map((x) => String(x)) : []
  } catch {
    return []
  }
}

function toPhoto(row: Row): Photo {
  return {
    id: row.id,
    path: row.path,
    filename: row.filename,
    mtimeMs: row.mtimeMs,
    fileSize: row.fileSize,
    createdAt: row.createdAt,
    edited: row.edited === 1,
    tags: parseTags(row.tags),
    rating: row.rating,
    name: row.name ?? '',
    editedAt: row.editedAt
  }
}

export function listPhotos(db: DatabaseSync): Photo[] {
  const rows = db.prepare(`${SELECT} ORDER BY created_at ASC, id ASC`).all() as unknown as Row[]
  return rows.map(toPhoto)
}

export function getById(db: DatabaseSync, id: number): Photo | undefined {
  const row = db.prepare(`${SELECT} WHERE id = ?`).get(id) as unknown as Row | undefined
  return row ? toPhoto(row) : undefined
}

export function countPhotos(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS c FROM photos').get() as { c: number }
  return row.c
}

// 导入单个文件（复制到 saveDir 生成副本，按 source_path 去重）
function uniqueCopyPath(dir: string, name: string): string {
  mkdirSync(dir, { recursive: true })
  const ext = extname(name)
  const base = basename(name, ext)
  let candidate = join(dir, name)
  let i = 1
  while (existsSync(candidate)) {
    candidate = join(dir, `${base} (${i})${ext}`)
    i++
  }
  return candidate
}

export interface ImportResult {
  photos: Photo[]
  errors: string[]
}

export function importPhotoFiles(db: DatabaseSync, saveDir: string, paths: string[]): ImportResult {
  const insert = db.prepare(
    "INSERT INTO photos (path, filename, mtime_ms, file_size, source_path, created_at, edited, tags) VALUES (?, ?, ?, ?, ?, ?, 0, '[]')"
  )
  const update = db.prepare('UPDATE photos SET mtime_ms = ?, file_size = ?, filename = ? WHERE id = ?')
  const find = db.prepare('SELECT id FROM photos WHERE source_path = ?')
  const getPath = db.prepare('SELECT path FROM photos WHERE id = ?')

  const photos: Photo[] = []
  const errors: string[] = []

  for (const src of paths) {
    const name = basename(src)
    try {
      const s = statSync(src)
      const existing = find.get(src) as { id: number } | undefined
      let id: number
      if (existing) {
        id = existing.id
        const row = getPath.get(id) as { path: string }
        if (!existsSync(row.path)) copyFileSync(src, row.path)
        update.run(Math.round(s.mtimeMs), s.size, name, id)
      } else {
        const copyPath = uniqueCopyPath(saveDir, name)
        copyFileSync(src, copyPath)
        const info = insert.run(copyPath, name, Math.round(s.mtimeMs), s.size, src, Date.now())
        id = Number(info.lastInsertRowid)
      }
      photos.push(getById(db, id)!)
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { photos, errors }
}

export function markEdited(db: DatabaseSync, id: number): void {
  // 用严格递增的时间戳记录「处理完毕」的先后顺序
  const now = Date.now()
  const row = db.prepare('SELECT COALESCE(MAX(edited_at), 0) AS m FROM photos').get() as { m: number }
  const stamp = now > row.m ? now : row.m + 1
  db.prepare('UPDATE photos SET edited = 1, edited_at = ? WHERE id = ?').run(stamp, id)
}

export function setPhotoTags(db: DatabaseSync, id: number, tags: string[]): void {
  db.prepare('UPDATE photos SET tags = ? WHERE id = ?').run(JSON.stringify(tags), id)
}

export function setRating(db: DatabaseSync, id: number, rating: number): void {
  db.prepare('UPDATE photos SET rating = ? WHERE id = ?').run(rating, id)
}

export function setPhotoName(db: DatabaseSync, id: number, name: string): void {
  db.prepare('UPDATE photos SET name = ? WHERE id = ?').run(name, id)
}

// 批量删除照片记录；deleteFiles=true 时同时删除 saveDir 内的副本（保护原始源文件，失败仅计数）
export function deletePhotos(db: DatabaseSync, ids: number[], deleteFiles = false, saveDir = ''): { fileErrors: number } {
  if (!ids.length) return { fileErrors: 0 }

  const getPath = db.prepare('SELECT path FROM photos WHERE id = ?')
  const paths: string[] = []
  if (deleteFiles) {
    for (const id of ids) {
      const row = getPath.get(id) as { path: string } | undefined
      if (row) paths.push(row.path)
    }
  }

  const del = db.prepare('DELETE FROM photos WHERE id = ?')
  db.exec('BEGIN')
  try {
    for (const id of ids) del.run(id)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  let fileErrors = 0
  if (deleteFiles) {
    for (const p of paths) {
      if (saveDir && !p.startsWith(saveDir + sep)) continue
      try {
        rmSync(p, { force: true })
      } catch {
        fileErrors++
      }
    }
  }
  return { fileErrors }
}

// —— savepicture 文件夹位置迁移 ——

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export function isWritableDir(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true })
    const probe = join(dir, `.photomind-probe-${Date.now()}`)
    writeFileSync(probe, 'ok')
    rmSync(probe, { force: true })
    return true
  } catch {
    return false
  }
}

// 递归列出目录下所有文件（返回相对路径，含子目录）
function collectFilesRelative(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string, rel: string): void => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const en of entries) {
      const p = join(d, en.name)
      const r = rel ? join(rel, en.name) : en.name
      if (en.isDirectory()) walk(p, r)
      else if (en.isFile()) out.push(r)
    }
  }
  walk(dir, '')
  return out
}

export interface MigrationResult {
  moved: number
  errors: string[]
}

// 将旧 saveDir 的全部文件迁移到新路径：复制（支持断点续传，目标已存在且大小一致则跳过）、
// 完整性校验、更新数据库 path、最后删除旧目录。任一步失败即保留旧目录，保证数据安全。
export function migrateSaveDir(
  db: DatabaseSync,
  oldDir: string,
  newDir: string,
  onProgress?: (current: number, total: number, bytes: number, totalBytes: number, name: string) => void
): MigrationResult {
  const files = collectFilesRelative(oldDir)
  const total = files.length
  const errors: string[] = []
  let done = 0

  // 预计算总字节数，用于字节级的精确进度
  const sizes = new Map<string, number>()
  let totalBytes = 0
  for (const rel of files) {
    try {
      const s = statSync(join(oldDir, rel))
      sizes.set(rel, s.size)
      totalBytes += s.size
    } catch {
      /* 不可读文件按 0 计 */
    }
  }
  let copiedBytes = 0

  try {
    mkdirSync(newDir, { recursive: true })
  } catch (err) {
    return { moved: 0, errors: [`无法创建目标目录: ${msg(err)}`] }
  }

  // 阶段一：复制（可断点续传）
  for (const rel of files) {
    const src = join(oldDir, rel)
    const dst = join(newDir, rel)
    const sz = sizes.get(rel) ?? 0
    let ok = true
    try {
      const s = statSync(src)
      if (!(existsSync(dst) && statSync(dst).size === s.size)) {
        mkdirSync(dirname(dst), { recursive: true })
        copyFileSync(src, dst)
        try {
          utimesSync(dst, s.atime, s.mtime)
        } catch {
          /* 时间戳非关键 */
        }
      }
    } catch (err) {
      errors.push(`${rel}: ${msg(err)}`)
      ok = false
    }
    if (ok) copiedBytes += sz
    done++
    onProgress?.(done, total, copiedBytes, totalBytes, rel)
  }

  // 阶段二：完整性校验（复制全部成功后逐文件比对大小）
  if (errors.length === 0) {
    for (const rel of files) {
      try {
        if (statSync(join(newDir, rel)).size !== statSync(join(oldDir, rel)).size) {
          errors.push(`${rel}: 复制后大小不一致`)
        }
      } catch (err) {
        errors.push(`${rel}: ${msg(err)}`)
      }
    }
  }

  if (errors.length > 0) return { moved: total - errors.length, errors }

  // 阶段三：更新数据库 path（旧前缀替换为新前缀），source_path 保持原样
  const oldPrefix = oldDir.endsWith(sep) ? oldDir : oldDir + sep
  const newPrefix = newDir.endsWith(sep) ? newDir : newDir + sep
  const rows = db.prepare('SELECT id, path FROM photos').all() as unknown as { id: number; path: string }[]
  const update = db.prepare('UPDATE photos SET path = ? WHERE id = ?')
  db.exec('BEGIN')
  try {
    for (const r of rows) {
      if (r.path.startsWith(oldPrefix)) update.run(newPrefix + r.path.slice(oldPrefix.length), r.id)
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    return { moved: total, errors: [`更新数据库失败: ${msg(err)}`] }
  }

  // 阶段四：删除旧目录（失败不阻断，数据已安全迁移；残留旧目录不影响功能）
  try {
    rmSync(oldDir, { recursive: true, force: true })
  } catch {
    /* 忽略 */
  }

  return { moved: total, errors: [] }
}