import type { DatabaseSync } from 'node:sqlite'
import type { MapEdge, MapEdgePatch, MapNode, MapNodePatch, MindMap } from '../shared/types'

const MAP_SELECT = `SELECT id, name, created_at AS createdAt, updated_at AS updatedAt FROM maps`
const NODE_SELECT = `SELECT id, map_id AS mapId, photo_id AS photoId, x, y, width, height, title FROM map_nodes`

export function getOrCreateDefaultMap(db: DatabaseSync): MindMap {
  const existing = db.prepare(`${MAP_SELECT} ORDER BY id ASC LIMIT 1`).get() as unknown as MindMap | undefined
  if (existing) return existing

  const info = db
    .prepare('INSERT INTO maps (name, created_at, updated_at) VALUES (?, ?, ?)')
    .run('默认画布', Date.now(), Date.now())
  return db.prepare(`${MAP_SELECT} WHERE id = ?`).get(Number(info.lastInsertRowid)) as unknown as MindMap
}

function getNodeById(db: DatabaseSync, id: number): MapNode | undefined {
  return db.prepare(`${NODE_SELECT} WHERE id = ?`).get(id) as unknown as MapNode | undefined
}

export function listMapNodes(db: DatabaseSync, mapId: number): MapNode[] {
  return db.prepare(`${NODE_SELECT} WHERE map_id = ? ORDER BY id ASC`).all(mapId) as unknown as MapNode[]
}

export function createMapNode(
  db: DatabaseSync,
  mapId: number,
  photoId: number,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string | null
): MapNode {
  const info = db
    .prepare('INSERT INTO map_nodes (map_id, photo_id, x, y, width, height, title) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(mapId, photoId, x, y, width, height, title)
  return getNodeById(db, Number(info.lastInsertRowid))!
}

export function updateMapNode(db: DatabaseSync, nodeId: number, patch: MapNodePatch): void {
  const fields: string[] = []
  const values: number[] = []
  if (patch.x !== undefined) {
    fields.push('x = ?')
    values.push(patch.x)
  }
  if (patch.y !== undefined) {
    fields.push('y = ?')
    values.push(patch.y)
  }
  if (patch.width !== undefined) {
    fields.push('width = ?')
    values.push(patch.width)
  }
  if (patch.height !== undefined) {
    fields.push('height = ?')
    values.push(patch.height)
  }
  if (fields.length === 0) return

  values.push(nodeId)
  db.prepare(`UPDATE map_nodes SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteMapNode(db: DatabaseSync, nodeId: number): void {
  db.prepare('DELETE FROM map_nodes WHERE id = ?').run(nodeId)
}

const EDGE_SELECT = `SELECT id, map_id AS mapId, source_node_id AS sourceNodeId, target_node_id AS targetNodeId, label FROM map_edges`

function getEdgeById(db: DatabaseSync, id: number): MapEdge | undefined {
  return db.prepare(`${EDGE_SELECT} WHERE id = ?`).get(id) as unknown as MapEdge | undefined
}

export function listMapEdges(db: DatabaseSync, mapId: number): MapEdge[] {
  return db.prepare(`${EDGE_SELECT} WHERE map_id = ? ORDER BY id ASC`).all(mapId) as unknown as MapEdge[]
}

export function createMapEdge(
  db: DatabaseSync,
  mapId: number,
  sourceNodeId: number,
  targetNodeId: number,
  label: string | null
): MapEdge {
  const info = db
    .prepare('INSERT INTO map_edges (map_id, source_node_id, target_node_id, label) VALUES (?, ?, ?, ?)')
    .run(mapId, sourceNodeId, targetNodeId, label)
  return getEdgeById(db, Number(info.lastInsertRowid))!
}

export function updateMapEdge(db: DatabaseSync, id: number, patch: MapEdgePatch): void {
  if (patch.label === undefined) return
  db.prepare('UPDATE map_edges SET label = ? WHERE id = ?').run(patch.label, id)
}

export function deleteMapEdge(db: DatabaseSync, id: number): void {
  db.prepare('DELETE FROM map_edges WHERE id = ?').run(id)
}

export function clearMapContents(db: DatabaseSync, mapId: number): void {
  db.prepare('DELETE FROM map_edges WHERE map_id = ?').run(mapId)
  db.prepare('DELETE FROM map_nodes WHERE map_id = ?').run(mapId)
}