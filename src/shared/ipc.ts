import type {
  Album,
  Category,
  ImportResult,
  LibraryData,
  MapEdge,
  MapEdgePatch,
  MapNode,
  MapNodePatch,
  PhotoWithCategories
} from './types'

export const CHANNELS = {
  importFolder: 'photos:import-folder',
  getLibrary: 'library:get',
  createCategory: 'categories:create',
  renameCategory: 'categories:rename',
  deleteCategory: 'categories:delete',
  setCategoryColor: 'categories:set-color',
  moveCategory: 'categories:move',
  addPhotoCategory: 'photo-categories:add',
  removePhotoCategory: 'photo-categories:remove',
  getCanvasNodes: 'canvas:get-nodes',
  createCanvasNode: 'canvas:create-node',
  updateCanvasNode: 'canvas:update-node',
  deleteCanvasNode: 'canvas:delete-node',
  getCanvasEdges: 'canvas:get-edges',
  createCanvasEdge: 'canvas:create-edge',
  updateCanvasEdge: 'canvas:update-edge',
  deleteCanvasEdge: 'canvas:delete-edge',
  listAlbums: 'albums:list',
  getAlbumPhotos: 'albums:get-photos',
  getSetting: 'settings:get',
  setSetting: 'settings:set'
} as const

// 渲染进程通过 window.api 访问的接口
export interface PhotoMindApi {
  importFolder(): Promise<ImportResult>
  getLibrary(): Promise<LibraryData>
  createCategory(name: string, color: string): Promise<Category>
  renameCategory(id: number, name: string): Promise<void>
  deleteCategory(id: number): Promise<void>
  setCategoryColor(id: number, color: string): Promise<void>
  moveCategory(id: number, direction: -1 | 1): Promise<void>
  addPhotoCategory(photoId: number, categoryId: number): Promise<void>
  removePhotoCategory(photoId: number, categoryId: number): Promise<void>
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
  listAlbums(): Promise<Album[]>
  getAlbumPhotos(albumKey: string): Promise<PhotoWithCategories[]>
  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string): Promise<void>
}