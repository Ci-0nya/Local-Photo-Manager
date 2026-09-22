import sharp from 'sharp'
import { ensureThumbnail } from './thumbnail'
import * as repo from './photoRepo'
import type { DatabaseSync } from 'node:sqlite'
import type { MindCanvasSnapshot } from '../shared/types'

const PAD = 40

// 将快照名称转换为基础文件名（去除非法字符），图片名保持与快照名称一致
export function sanitizeImageName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  return `${cleaned || 'canvas'}.jpg`
}

// 用 sharp 在后台异步合成画布图片（照片按布局位置拼合 + 连线），非阻塞主线程
export async function exportCanvasImage(
  db: DatabaseSync,
  thumbDir: string,
  snapshot: MindCanvasSnapshot
): Promise<Buffer | null> {
  const nodes = snapshot.nodes
  if (!nodes.length) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.width)
    maxY = Math.max(maxY, n.y + n.height)
  }
  const width = Math.max(1, Math.round(maxX - minX + PAD * 2))
  const height = Math.max(1, Math.round(maxY - minY + PAD * 2))

  const composites: Array<{ input: Buffer; left: number; top: number }> = []
  for (const n of nodes) {
    try {
      const photo = repo.getById(db, n.photoId)
      if (!photo) continue
      const thumbPath = await ensureThumbnail(thumbDir, photo)
      const w = Math.max(1, Math.round(n.width))
      const h = Math.max(1, Math.round(n.height))
      const buf = await sharp(thumbPath).resize(w, h, { fit: 'cover' }).toBuffer()
      composites.push({ input: buf, left: Math.round(n.x - minX + PAD), top: Math.round(n.y - minY + PAD) })
    } catch {
      // 单个节点失败跳过
    }
  }

  const overlays: Array<{ input: Buffer; left: number; top: number }> = [...composites]

  // 连线（SVG 直线），失败不影响图片
  const lines: string[] = []
  for (const e of snapshot.edges) {
    const s = nodes[e.source]
    const t = nodes[e.target]
    if (!s || !t) continue
    const x1 = Math.round(s.x - minX + PAD + s.width)
    const y1 = Math.round(s.y - minY + PAD + s.height / 2)
    const x2 = Math.round(t.x - minX + PAD)
    const y2 = Math.round(t.y - minY + PAD + t.height / 2)
    lines.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" />`
    )
  }
  if (lines.length) {
    try {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g>${lines.join('')}</g></svg>`
      const edgeBuf = await sharp(Buffer.from(svg)).png().toBuffer()
      overlays.push({ input: edgeBuf, left: 0, top: 0 })
    } catch {
      // SVG 渲染不可用则忽略连线
    }
  }

  // 单次 composite 合并照片与连线，避免多次 chained composite 丢失图层
  return sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite(overlays)
    .jpeg({ quality: 82 })
    .toBuffer()
}