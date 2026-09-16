import { useCallback, useEffect, useState, type PointerEvent, type WheelEvent } from 'react'
import type { PhotoWithCategories } from '@shared/types'
import { useLibraryStore } from '../store/library'

const MIN_SCALE = 1
const MAX_SCALE = 8

export function PhotoViewer({
  photos,
  index,
  onClose
}: {
  photos: PhotoWithCategories[]
  index: number
  onClose: () => void
}) {
  const [curIndex, setCurIndex] = useState(index)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState<{
    pointerId: number
    startX: number
    startY: number
    baseX: number
    baseY: number
  } | null>(null)
  const [catPanelOpen, setCatPanelOpen] = useState(false)

  const categories = useLibraryStore((s) => s.categories)
  const togglePhotoCategory = useLibraryStore((s) => s.togglePhotoCategory)

  const photo = photos[curIndex]

  const resetView = useCallback(() => {
    setScale(1)
    setPos({ x: 0, y: 0 })
  }, [])

  const goTo = useCallback(
    (delta: number) => {
      const next = Math.min(photos.length - 1, Math.max(0, curIndex + delta))
      if (next !== curIndex) {
        setCurIndex(next)
        resetView()
      }
    },
    [curIndex, photos.length, resetView]
  )

  // 当前照片被移出相册（放入分类）后，自动顺延到"下一张"；越界则回退到最后一张
  useEffect(() => {
    if (photos.length > 0 && curIndex >= photos.length) {
      setCurIndex(photos.length - 1)
    }
  }, [photos.length, curIndex])

  // 当前照片变化时复位视图（缩放/平移）
  const currentId = photo?.id
  useEffect(() => {
    resetView()
  }, [currentId, resetView])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(1)
      } else if (e.key === 'Escape') {
        if (catPanelOpen) setCatPanelOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, onClose, catPanelOpen])

  if (!photo) return null

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor))
    if (next !== scale) {
      setScale(next)
      if (next <= MIN_SCALE) setPos({ x: 0, y: 0 })
    }
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (scale <= MIN_SCALE) return
    setDrag({
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y
    })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return
    setPos({
      x: drag.baseX + (e.clientX - drag.startX),
      y: drag.baseY + (e.clientY - drag.startY)
    })
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag?.pointerId === e.pointerId) setDrag(null)
  }

  const navBtn =
    'rounded p-1.5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="relative z-20 flex shrink-0 items-center justify-between gap-4 px-5 py-3 text-neutral-200">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="truncate text-sm font-medium">{photo.filename}</span>
          <span className="shrink-0 text-sm tabular-nums text-neutral-400">
            {curIndex + 1} / {photos.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => goTo(-1)} disabled={curIndex === 0} className={navBtn} aria-label="上一张">
            <span className="text-2xl leading-none">‹</span>
          </button>
          <button
            onClick={() => goTo(1)}
            disabled={curIndex === photos.length - 1}
            className={navBtn}
            aria-label="下一张"
          >
            <span className="text-2xl leading-none">›</span>
          </button>
          <button
            onClick={() => setCatPanelOpen((v) => !v)}
            className="rounded px-2 py-1 text-sm text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            分类
          </button>
          <button
            onClick={onClose}
            className="ml-2 rounded p-1.5 text-2xl leading-none text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {catPanelOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setCatPanelOpen(false)} />
            <div className="absolute right-4 top-12 z-30 w-56 rounded-lg border border-neutral-700 bg-neutral-900 p-2 shadow-xl">
              {categories.length === 0 ? (
                <p className="p-2 text-sm text-neutral-400">暂无分类，请先在首页创建</p>
              ) : (
                categories.map((c) => {
                  const active = photo.categoryIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => togglePhotoCategory(photo.id, c.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-neutral-200 hover:bg-white/10"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: active ? c.color : 'transparent',
                          border: `1.5px solid ${c.color}`
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-left">{c.name}</span>
                      {active && <span className="text-blue-400">✓</span>}
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* 照片区域：四周留白，不铺满；图层位于顶部按钮之下 */}
      <div
        className={`relative z-0 flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-12 ${
          scale > MIN_SCALE ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => resetView()}
      >
        <img
          src={`photomind://photo/${photo.id}`}
          alt={photo.filename}
          draggable={false}
          className="select-none"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      <div className="relative z-20 shrink-0 px-5 py-3">
        <p className="truncate text-xs text-neutral-500" title={photo.path}>
          {photo.path}
        </p>
      </div>
    </div>
  )
}