import { readdir, stat } from 'fs/promises'
import { extname, join } from 'path'
import type { ScannedPhoto } from '../shared/types'

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])

export interface ScanResult {
  dirs: string[] // 扫描过程中遇到的所有目录（含根目录）
  photos: ScannedPhoto[] // 每张照片带 dirPath（直接父目录）
}

// 递归扫描目录，返回目录列表与照片（只读，不修改任何文件）
export async function scanDirectory(rootDir: string): Promise<ScanResult> {
  const dirs: string[] = []
  const photos: ScannedPhoto[] = []

  async function walk(dir: string): Promise<void> {
    dirs.push(dir)
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile() && SUPPORTED.has(extname(entry.name).toLowerCase())) {
        try {
          const s = await stat(full)
          photos.push({
            path: full,
            filename: entry.name,
            mtimeMs: Math.round(s.mtimeMs),
            fileSize: s.size,
            dirPath: dir
          })
        } catch {
          // 单个文件读取失败则跳过
        }
      }
    }
  }

  await walk(rootDir)
  return { dirs, photos }
}