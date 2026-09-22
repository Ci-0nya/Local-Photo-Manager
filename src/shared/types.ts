export interface Photo {
  id: number
  path: string
  filename: string
  mtimeMs: number
  fileSize: number
  createdAt: number
  edited: boolean // true = 已处理完成
  tags: string[]
  rating: number // 0 未评分，1-5 星
  name: string // 自定义名称，空表示未命名
  editedAt: number | null // 用户「处理完毕」的时间戳（编辑顺序），未编辑为 null
}

export interface PhotoExif {
  takenAt?: string // 拍摄时间
  shutter?: string // 快门速度
  iso?: string
  aperture?: string // 光圈
  flash?: string // 闪光灯功率/状态（尽力读取）
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

// 联想库：保存画布状态的标准化快照
export interface MindNodeSnapshot {
  photoId: number
  name: string
  x: number
  y: number
  width: number
  height: number
}

export interface MindEdgeSnapshot {
  source: number // nodes 数组下标
  target: number // nodes 数组下标
  label: string | null
}

export interface MindCanvasSnapshot {
  nodes: MindNodeSnapshot[]
  edges: MindEdgeSnapshot[]
}

export interface MindLibraryItem {
  id: number
  name: string
  createdAt: number
  imageName: string | null
  snapshot: MindCanvasSnapshot
}