export interface Photo {
  id: number
  path: string
  filename: string
  mtimeMs: number
  fileSize: number
  createdAt: number
}

export interface ScannedPhoto {
  path: string
  filename: string
  mtimeMs: number
  fileSize: number
  dirPath: string // 照片所在（直接父）目录
}

export interface ImportResult {
  canceled: boolean
  dir: string
  added: number
  skipped: number
  total: number
}

export interface Category {
  id: number
  name: string
  color: string
  sort: number
  createdAt: number
}

export interface PhotoWithCategories extends Photo {
  categoryIds: number[]
}

export interface LibraryData {
  photos: PhotoWithCategories[]
  categories: Category[]
}

export interface MindMap {
  id: number
  name: string
  createdAt: number
  updatedAt: number
}

export interface MapNode {
  id: number
  mapId: number
  photoId: number
  x: number
  y: number
  width: number
  height: number
  title: string | null
}

export interface MapNodePatch {
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface MapEdge {
  id: number
  mapId: number
  sourceNodeId: number
  targetNodeId: number
  label: string | null
}

export interface MapEdgePatch {
  label?: string | null
}

export interface Folder {
  id: number
  name: string
  path: string
  parentId: number | null
  createdAt: number
}

export type AlbumKind = 'folder' | 'category' | 'uncategorized'

export interface Album {
  key: string // 'folder:<id>' | 'category:<id>' | 'uncategorized'
  kind: AlbumKind
  name: string
  color: string | null
  count: number
  coverPhotoIds: number[] // 最多 4 个，按导入时间最早优先
}