import type {
  MapEdge,
  MapEdgePatch,
  MapNode,
  MapNodePatch,
  MindCanvasSnapshot,
  MindLibraryItem,
  Photo,
  PhotoExif
} from './types'

export interface SaveDirProgress {
  current: number
  total: number
  bytes: number
  totalBytes: number
  name: string
}

export interface SaveDirValidation {
  ok: boolean
  reason?: string
}

export interface SaveDirMigration {
  moved: number
  errors: string[]
}

export interface BackgroundSettings {
  image: string | null
  opacity: number
}

export const CHANNELS = {
  pickImages: 'photos:pick',
  pickFolderAndImport: 'photos:pick-folder-import',
  importPhotos: 'photos:import',
  getPhotos: 'photos:get-all',
  markEdited: 'photos:mark-edited',
  setPhotoTags: 'photos:set-tags',
  setRating: 'photos:set-rating',
  setPhotoName: 'photos:set-name',
  deletePhotos: 'photos:delete',
  readExif: 'photos:read-exif',
  getCanvasNodes: 'canvas:get-nodes',
  createCanvasNode: 'canvas:create-node',
  updateCanvasNode: 'canvas:update-node',
  deleteCanvasNode: 'canvas:delete-node',
  getCanvasEdges: 'canvas:get-edges',
  createCanvasEdge: 'canvas:create-edge',
  updateCanvasEdge: 'canvas:update-edge',
  deleteCanvasEdge: 'canvas:delete-edge',
  getSaveDir: 'settings:get-save-dir',
  pickSaveDir: 'settings:pick-save-dir',
  validateSaveDir: 'settings:validate-save-dir',
  migrateSaveDir: 'settings:migrate-save-dir',
  saveDirProgress: 'settings:save-dir-progress',
  saveMindLibrary: 'library:save',
  listMindLibrary: 'library:list',
  deleteMindLibrary: 'library:delete',
  clearCanvas: 'canvas:clear',
  getBackground: 'settings:get-background',
  pickBackground: 'settings:pick-background',
  applyBackground: 'settings:apply-background',
  setBackgroundOpacity: 'settings:set-background-opacity',
  clearBackground: 'settings:clear-background'
} as const

// 渲染进程通过 window.api 访问的接口
export interface PhotoMindApi {
  pickImages(): Promise<string[]>
  pickFolderAndImport(): Promise<{ photos: Photo[]; errors: string[] }>
  importPhotos(paths: string[]): Promise<{ photos: Photo[]; errors: string[] }>
  getPhotos(): Promise<Photo[]>
  markEdited(id: number): Promise<void>
  setPhotoTags(id: number, tags: string[]): Promise<void>
  setRating(id: number, rating: number): Promise<void>
  setPhotoName(id: number, name: string): Promise<void>
  deletePhotos(ids: number[], deleteFiles: boolean): Promise<{ fileErrors: number }>
  readExif(photoId: number): Promise<PhotoExif>
  getCanvasNodes(): Promise<MapNode[]>
  createCanvasNode(
    photoId: number,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string | null
  ): Promise<MapNode>
  updateCanvasNode(id: number, patch: MapNodePatch): Promise<void>
  deleteCanvasNode(id: number): Promise<void>
  getCanvasEdges(): Promise<MapEdge[]>
  createCanvasEdge(sourceNodeId: number, targetNodeId: number, label: string | null): Promise<MapEdge>
  updateCanvasEdge(id: number, patch: MapEdgePatch): Promise<void>
  deleteCanvasEdge(id: number): Promise<void>
  getSaveDir(): Promise<string>
  pickSaveDir(): Promise<string | null>
  validateSaveDir(path: string): Promise<SaveDirValidation>
  migrateSaveDir(path: string): Promise<SaveDirMigration>
  onSaveDirProgress(cb: (p: SaveDirProgress) => void): () => void
  saveMindLibrary(name: string, snapshot: MindCanvasSnapshot): Promise<MindLibraryItem>
  listMindLibrary(): Promise<MindLibraryItem[]>
  deleteMindLibrary(ids: number[]): Promise<void>
  clearCanvas(): Promise<void>
  getBackground(): Promise<BackgroundSettings>
  pickBackground(): Promise<string | null>
  applyBackground(path: string): Promise<BackgroundSettings>
  setBackgroundOpacity(opacity: number): Promise<void>
  clearBackground(): Promise<void>
}