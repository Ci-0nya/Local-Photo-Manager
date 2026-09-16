import type { DatabaseSync } from 'node:sqlite'

export function getPhotoCategoryIds(db: DatabaseSync, photoId: number): number[] {
  const rows = db
    .prepare('SELECT category_id AS categoryId FROM photo_categories WHERE photo_id = ?')
    .all(photoId) as unknown as { categoryId: number }[]
  return rows.map((r) => r.categoryId)
}

export function addPhotoCategory(db: DatabaseSync, photoId: number, categoryId: number): void {
  db.prepare('INSERT OR IGNORE INTO photo_categories (photo_id, category_id) VALUES (?, ?)').run(photoId, categoryId)
}

export function removePhotoCategory(db: DatabaseSync, photoId: number, categoryId: number): void {
  db.prepare('DELETE FROM photo_categories WHERE photo_id = ? AND category_id = ?').run(photoId, categoryId)
}