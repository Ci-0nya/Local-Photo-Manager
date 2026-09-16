import type { DatabaseSync } from 'node:sqlite'
import type { Album, PhotoWithCategories } from '../shared/types'
import * as categoryRepo from './categoryRepo'

interface PhotoRow {
  id: number
  path: string
  filename: string
  mtimeMs: number
  fileSize: number
  createdAt: number
}

function loadContext(db: DatabaseSync): { photos: PhotoRow[]; catIdsByPhoto: Map<number, number[]> } {
  const photos = db
    .prepare(
      `SELECT id, path, filename, mtime_ms AS mtimeMs, file_size AS fileSize, created_at AS createdAt
       FROM photos ORDER BY created_at ASC, id ASC`
    )
    .all() as unknown as PhotoRow[]

  const pairs = db
    .prepare('SELECT photo_id AS photoId, category_id AS categoryId FROM photo_categories')
    .all() as unknown as { photoId: number; categoryId: number }[]

  const catIdsByPhoto = new Map<number, number[]>()
  for (const p of pairs) {
    const list = catIdsByPhoto.get(p.photoId)
    if (list) list.push(p.categoryId)
    else catIdsByPhoto.set(p.photoId, [p.categoryId])
  }

  return { photos, catIdsByPhoto }
}

function toPhotoWithCategories(row: PhotoRow, catIds: number[]): PhotoWithCategories {
  return {
    id: row.id,
    path: row.path,
    filename: row.filename,
    mtimeMs: row.mtimeMs,
    fileSize: row.fileSize,
    createdAt: row.createdAt,
    categoryIds: catIds
  }
}

// 首页相册：只有「未分类」和「分类」。导入的文件夹不再单独成册。
export function listAlbums(db: DatabaseSync): Album[] {
  const ctx = loadContext(db)
  const categories = categoryRepo.listCategories(db)
  const albums: Album[] = []

  const uncat = ctx.photos.filter((p) => (ctx.catIdsByPhoto.get(p.id)?.length ?? 0) === 0)
  albums.push({
    key: 'uncategorized',
    kind: 'uncategorized',
    name: '未分类',
    color: null,
    count: uncat.length,
    coverPhotoIds: uncat.slice(0, 4).map((p) => p.id)
  })

  for (const c of categories) {
    const members = ctx.photos.filter((p) => (ctx.catIdsByPhoto.get(p.id) ?? []).includes(c.id))
    albums.push({
      key: `category:${c.id}`,
      kind: 'category',
      name: c.name,
      color: c.color,
      count: members.length,
      coverPhotoIds: members.slice(0, 4).map((p) => p.id)
    })
  }

  return albums
}

export function getAlbumPhotos(db: DatabaseSync, albumKey: string): PhotoWithCategories[] {
  const ctx = loadContext(db)

  let members: PhotoRow[]
  if (albumKey === 'uncategorized') {
    members = ctx.photos.filter((p) => (ctx.catIdsByPhoto.get(p.id)?.length ?? 0) === 0)
  } else if (albumKey.startsWith('category:')) {
    const id = Number(albumKey.slice('category:'.length))
    members = ctx.photos.filter((p) => (ctx.catIdsByPhoto.get(p.id) ?? []).includes(id))
  } else {
    return []
  }

  return members.map((p) => toPhotoWithCategories(p, ctx.catIdsByPhoto.get(p.id) ?? []))
}