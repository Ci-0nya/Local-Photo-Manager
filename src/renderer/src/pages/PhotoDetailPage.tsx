import { useEffect, useRef, useState } from 'react'
import type { Photo, PhotoExif } from '@shared/types'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function PhotoDetailPage({
  photos,
  index,
  onBack
}: {
  photos: Photo[]
  index: number
  onBack: () => void
}) {
  const [idx, setIdx] = useState(index)
  const [exif, setExif] = useState<PhotoExif>({})
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState({ s: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinchStart = useRef<{ dist: number; scale: number; ox: number; oy: number; mx: number; my: number } | null>(null)
  const swipeRef = useRef<{ sx: number; sy: number; x: number; y: number; id: number } | null>(null)

  const photo = photos[idx]
  const hasPrev = idx > 0
  const hasNext = idx < photos.length - 1

  const setViewSync = (v: { s: number; x: number; y: number }) => {
    viewRef.current = v
    setView(v)
  }

  const clampOffset = (s: number, x: number, y: number) => {
    if (s <= 1) return { x: 0, y: 0 }
    const stage = stageRef.current
    const img = imgRef.current
    if (!stage || !img) return { x, y }
    const overX = img.clientWidth * s - stage.clientWidth
    const overY = img.clientHeight * s - stage.clientHeight
    const maxX = overX > 0 ? overX / 2 : 0
    const maxY = overY > 0 ? overY / 2 : 0
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) }
  }

  const reset = () => setViewSync({ s: 1, x: 0, y: 0 })

  const go = (n: number) => {
    if (n < 0 || n >= photos.length) return
    setLoading(true)
    setIdx(n)
  }

  useEffect(() => {
    reset()
    setLoading(true)
    setExif({})
    window.api.readExif(photo.id).then(setExif)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const onWheel = (e: React.WheelEvent) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const v = viewRef.current
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const ns = clamp(v.s * factor, 1, 8)
    const k = ns / v.s
    const nx = v.x - (mx - rect.width / 2 - v.x) * (k - 1)
    const ny = v.y - (my - rect.height / 2 - v.y) * (k - 1)
    const { x, y } = clampOffset(ns, nx, ny)
    setViewSync({ s: ns, x, y })
  }

  const zoomBy = (f: number) => {
    const stage = stageRef.current
    if (!stage) return
    const v = viewRef.current
    const ns = clamp(v.s * f, 1, 8)
    const k = ns / v.s
    const { x, y } = clampOffset(ns, v.x * k, v.y * k)
    setViewSync({ s: ns, x, y })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const stage = stageRef.current
    if (!stage) return
    if ((e.target as HTMLElement).closest('button')) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const rect = stage.getBoundingClientRect()
    pointers.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top })
    stage.setPointerCapture(e.pointerId)
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, ox: viewRef.current.x, oy: viewRef.current.y }
      if (e.pointerType !== 'mouse') {
        swipeRef.current = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId }
      }
    } else if (pointers.current.size === 2) {
      swipeRef.current = null
      const pts = [...pointers.current.values()]
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      pinchStart.current = {
        dist: Math.hypot(dx, dy),
        scale: viewRef.current.s,
        ox: viewRef.current.x,
        oy: viewRef.current.y,
        mx: (pts[0].x + pts[1].x) / 2,
        my: (pts[0].y + pts[1].y) / 2
      }
      dragStart.current = null
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const stage = stageRef.current
    if (!stage || !pointers.current.has(e.pointerId)) return
    const rect = stage.getBoundingClientRect()
    pointers.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top })
    if (swipeRef.current && swipeRef.current.id === e.pointerId) {
      swipeRef.current.x = e.clientX
      swipeRef.current.y = e.clientY
    }

    if (pinchStart.current && pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const p = pinchStart.current
      const ns = clamp(p.scale * (dist / p.dist), 1, 8)
      const k = ns / p.scale
      const nx = p.ox - (p.mx - rect.width / 2 - p.ox) * (k - 1)
      const ny = p.oy - (p.my - rect.height / 2 - p.oy) * (k - 1)
      const { x, y } = clampOffset(ns, nx, ny)
      setViewSync({ s: ns, x, y })
    } else if (dragStart.current) {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      const v = viewRef.current
      const { x, y } = clampOffset(v.s, dragStart.current.ox + dx, dragStart.current.oy + dy)
      setViewSync({ s: v.s, x, y })
    }
  }

  const endPointer = (e: React.PointerEvent) => {
    const sw = swipeRef.current
    if (sw && sw.id === e.pointerId) {
      if (viewRef.current.s <= 1) {
        const dx = sw.x - sw.sx
        const dy = sw.y - sw.sy
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) go(idx + 1)
          else go(idx - 1)
        }
      }
      swipeRef.current = null
    }
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchStart.current = null
    if (pointers.current.size === 0) dragStart.current = null
  }

  const rows: Array<[string, string | undefined]> = [
    ['拍摄时间', exif.takenAt],
    ['快门速度', exif.shutter],
    ['ISO', exif.iso],
    ['光圈', exif.aperture],
    ['闪光灯', exif.flash]
  ]

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-neutral-900 text-neutral-100">
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-700 px-5 py-3">
        <button
          onClick={onBack}
          className="rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-200 transition-colors hover:bg-neutral-800"
        >
          ← 返回
        </button>
        <span className="truncate text-sm text-neutral-400">
          {idx + 1} / {photos.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* 左侧信息栏 */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-neutral-700 p-4 lg:w-72">
          <h2 className="mb-4 break-words text-lg font-semibold text-white">{photo.name || photo.filename}</h2>

          <h3 className="mb-2 text-sm font-medium text-neutral-300">照片信息</h3>
          <dl className="space-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-neutral-500">{k}</dt>
                <dd className="break-words text-neutral-200">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mb-2 mt-5 text-sm font-medium text-neutral-300">标签</h3>
          {photo.tags.length === 0 ? (
            <p className="text-sm text-neutral-500">暂无标签</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {photo.tags.map((t) => (
                <span key={t} className="rounded bg-neutral-700 px-2 py-0.5 text-xs text-neutral-100">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </aside>

        {/* 大图交互区域 */}
        <div
          ref={stageRef}
          className="relative flex min-w-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={reset}
        >
          <img
            key={photo.id}
            ref={imgRef}
            src={`photomind://photo/${photo.id}`}
            alt={photo.name || photo.filename}
            draggable={false}
            onLoad={() => setLoading(false)}
            className="animate-fade-in select-none"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
              transformOrigin: 'center center'
            }}
          />

          {/* 左右导航按钮 */}
          <button
            onClick={() => go(idx - 1)}
            disabled={!hasPrev}
            aria-label="上一张"
            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white transition hover:bg-black/70 active:scale-95 disabled:pointer-events-none disabled:opacity-0"
          >
            ‹
          </button>
          <button
            onClick={() => go(idx + 1)}
            disabled={!hasNext}
            aria-label="下一张"
            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white transition hover:bg-black/70 active:scale-95 disabled:pointer-events-none disabled:opacity-0"
          >
            ›
          </button>

          {/* 加载提示 */}
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <span className="rounded bg-black/60 px-3 py-1.5 text-sm text-white">加载中…</span>
            </div>
          )}

          {/* 缩放控制与比例显示 */}
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-black/60 p-1 text-xs text-white">
            <button onClick={() => zoomBy(1 / 1.25)} className="rounded px-2 py-1 hover:bg-white/20" title="缩小">
              −
            </button>
            <span className="min-w-[3.25rem] text-center tabular-nums">{Math.round(view.s * 100)}%</span>
            <button onClick={() => zoomBy(1.25)} className="rounded px-2 py-1 hover:bg-white/20" title="放大">
              +
            </button>
            <button onClick={reset} className="rounded px-2 py-1 hover:bg-white/20" title="复位">
              复位
            </button>
          </div>

          {/* 操作提示 */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-xs text-neutral-300">
            点击两侧箭头切换 · 滚轮 / 双指缩放 · 拖拽移动 · 双击复位
          </div>
        </div>
      </div>
    </div>
  )
}