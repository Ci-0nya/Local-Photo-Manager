import { protocol } from 'electron'
import { readFile } from 'fs/promises'
import { extname, basename, join } from 'path'
import type { DatabaseSync } from 'node:sqlite'
import * as repo from './photoRepo'
import { ensureThumbnail } from './thumbnail'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
}

export function registerSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'photomind',
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

// photomind://thumb/{id} -> 缩略图；photomind://photo/{id} -> 原图；photomind://lib/{imageName} -> 联想库画布图片
export function registerMediaProtocol(deps: { db: DatabaseSync; thumbDir: string; kushotDir: string }): void {
  protocol.handle('photomind', async (request) => {
    try {
      const url = new URL(request.url)

      // 联想库保存的画布图片
      if (url.hostname === 'lib') {
        const name = basename(decodeURIComponent(url.pathname.replace(/^\//, '')))
        const data = await readFile(join(deps.kushotDir, name))
        return new Response(new Uint8Array(data), {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' }
        })
      }

      const id = Number(url.pathname.replace(/^\//, ''))
      if (!Number.isInteger(id) || id <= 0) {
        return new Response('Bad request', { status: 400 })
      }

      const photo = repo.getById(deps.db, id)
      if (!photo) {
        return new Response('Not found', { status: 404 })
      }

      const filePath = url.hostname === 'thumb' ? await ensureThumbnail(deps.thumbDir, photo) : photo.path
      const mime = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      const data = await readFile(filePath)
      return new Response(new Uint8Array(data), {
        headers: { 'Content-Type': mime, 'Cache-Control': 'no-cache' }
      })
    } catch {
      return new Response('Internal error', { status: 500 })
    }
  })
}