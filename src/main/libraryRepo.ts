import type { DatabaseSync } from 'node:sqlite'
import type { LibraryData } from '../shared/types'
import * as photoRepo from './photoRepo'
import * as categoryRepo from './categoryRepo'

export function getLibrary(db: DatabaseSync): LibraryData {
  const photos = photoRepo.listPhotos(db)
  const categories = categoryRepo.listCategories(db)
  const pairs = db
    .prepare('SELECT photo_id AS photoId, category_id AS categoryId FROM photo_categories')
    .all() as unknown as { photoId: number; categoryId: number }[]

  const map = new Map<number, number[]>()
  for (const p of pairs) {
    const list = map.get(p.photoId)
    if (list) list.push(p.categoryId)
    else map.set(p.photoId, [p.categoryId])
  }

  return {
    photos: photos.map((ph) => ({ ...ph, categoryIds: map.get(ph.id) ?? [] })),
    categories
  }
}