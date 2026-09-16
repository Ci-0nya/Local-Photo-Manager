import sharp from 'sharp'
import { mkdir, rename, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

interface ThumbSource {
  id: number
  path: string
}

// 生成缩略图到 appData/thumbnails，返回实际可用于展示的文件路径（失败时回退原图）
export async function ensureThumbnail(thumbDir: string, photo: ThumbSource): Promise<string> {
  const outPath = join(thumbDir, `${photo.id}.jpg`)
  if (existsSync(outPath)) return outPath

  await mkdir(thumbDir, { recursive: true })
  const tmp = `${outPath}.tmp`

  try {
    await sharp(photo.path)
      .rotate()
      .resize({ width: 480, height: 480, fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toFile(tmp)
    await rename(tmp, outPath)
    return outPath
  } catch {
    try {
      if (existsSync(tmp)) await unlink(tmp)
    } catch {
      // ignore
    }
    return photo.path
  }
}