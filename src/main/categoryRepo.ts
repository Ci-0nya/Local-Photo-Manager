import type { DatabaseSync } from 'node:sqlite'
import type { Category } from '../shared/types'

const SELECT = `SELECT id, name, color, sort, created_at AS createdAt FROM categories`

export function listCategories(db: DatabaseSync): Category[] {
  return db.prepare(`${SELECT} ORDER BY sort ASC, id ASC`).all() as unknown as Category[]
}

function getById(db: DatabaseSync, id: number): Category | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as unknown as Category | undefined
}

export function createCategory(db: DatabaseSync, name: string, color: string): Category {
  const next =
    (db.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM categories').get() as unknown as { n: number }).n
  const info = db
    .prepare('INSERT INTO categories (name, color, sort, created_at) VALUES (?, ?, ?, ?)')
    .run(name, color, next, Date.now())
  return getById(db, Number(info.lastInsertRowid))!
}

export function renameCategory(db: DatabaseSync, id: number, name: string): void {
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id)
}

export function setCategoryColor(db: DatabaseSync, id: number, color: string): void {
  db.prepare('UPDATE categories SET color = ? WHERE id = ?').run(color, id)
}

export function deleteCategory(db: DatabaseSync, id: number): void {
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
}

export function moveCategory(db: DatabaseSync, id: number, direction: -1 | 1): void {
  const all = listCategories(db)
  const idx = all.findIndex((c) => c.id === id)
  if (idx < 0) return

  const target = idx + direction
  if (target < 0 || target >= all.length) return

  const ids = all.map((c) => c.id)
  const tmp = ids[idx]
  ids[idx] = ids[target]
  ids[target] = tmp

  const setSort = db.prepare('UPDATE categories SET sort = ? WHERE id = ?')
  db.exec('BEGIN')
  try {
    ids.forEach((cid, i) => setSort.run(i, cid))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}