import type { PhotoExif } from '../shared/types'

// 读取 EXIF，尽力提取拍摄时间/快门/ISO/光圈/闪光灯（读不到留空）
export async function readExif(filePath: string): Promise<PhotoExif> {
  try {
    const mod: any = await import('exifr')
    const parse = mod.parse ?? mod.default?.parse ?? mod.default
    const d = await parse(filePath)
    if (!d) return {}
    return {
      takenAt: fmtDate(d.DateTimeOriginal ?? d.CreateDate),
      shutter: fmtShutter(d.ExposureTime),
      iso: d.ISO != null ? String(d.ISO) : undefined,
      aperture: d.FNumber != null ? `f/${d.FNumber}` : undefined,
      flash: fmtFlash(d)
    }
  } catch {
    return {}
  }
}

function fmtDate(v: unknown): string | undefined {
  if (v == null) return undefined
  if (v instanceof Date) return v.toLocaleString()
  return String(v)
}

function fmtShutter(v: unknown): string | undefined {
  if (v == null) return undefined
  if (typeof v === 'number') {
    if (v > 0 && v < 1) return `1/${Math.round(1 / v)}s`
    return `${v}s`
  }
  return String(v)
}

// 闪光灯「功率」尽力读取私有标签，否则退化为闪光状态
function fmtFlash(d: Record<string, unknown>): string | undefined {
  const comp = d.FlashExposureComp ?? d.FlashCompensation
  if (comp != null) return `补偿 ${comp}`
  const flash = d.Flash
  if (flash == null) return undefined
  const map: Record<number, string> = {
    0: '未闪光',
    1: '闪光',
    5: '闪光（无返回）',
    7: '闪光（防红眼）',
    9: '强制闪光',
    13: '强制闪光（防红眼）',
    16: '强制关闭',
    24: '自动（开）',
    25: '自动',
    65: '防红眼',
    69: '防红眼（强制）',
    73: '防红眼（自动）'
  }
  return map[flash as number] ?? `Flash=${flash}`
}