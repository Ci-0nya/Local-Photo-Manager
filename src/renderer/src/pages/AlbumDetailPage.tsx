import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { PhotoWithCategories } from '@shared/types'
import { useLibraryStore } from '../store/library'
import { PhotoViewer } from '../components/Viewer'

const PADDING_X = 40
const GAP = 12
const MIN_CELL = 160

export function AlbumDetailPage({ albumKey, onBack }: { albumKey: string; onBack: () => void }) {
  const albums = useLibraryStore((s) => s.albums)
  const storePhotos = useLibraryStore((s) => s.photos)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [columns, setColumns] = useState(5)
  const scrollRef = useRef<HTMLDivElement>(null)

  const album = albums.find((a) => a.key === albumKey)

  // 相册照片从 store 实时派生，分类操作后立即更新显示
  const photos = useMemo<PhotoWithCategories[]>(() => {
    if (albumKey === 'uncategorized') return storePhotos.filter((p) => p.categoryIds.length === 0)
    if (albumKey.startsWith('category:')) {
      const id = Number(albumKey.slice('category:'.length))
      return storePhotos.filter((p) => p.categoryIds.includes(id))
    }
    return []
  }, [albumKey, storePhotos])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setColumns(Math.max(1, Math.floor((el.clientWidth - PADDING_X + GAP) / (MIN_CELL + GAP))))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const indexById = useMemo(() => new Map(photos.map((p, i) => [p.id, i])), [photos])

  const rowCount = Math.ceil(photos.length / columns)
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 172,
    overscan: 8,
    measureElement: (el) => el.getBoundingClientRect().height
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-5 py-3">
        <button
          onClick={onBack}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          ← 返回
        </button>
        <h2 className="truncate text-sm font-medium">{album?.name ?? '相册'}</h2>
        <span className="shrink-0 text-sm text-neutral-400">({photos.length})</span>
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-neutral-400">
          该相册暂无照片，可在查看照片时通过「分类」加入
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const rowPhotos = photos.slice(vi.index * columns, vi.index * columns + columns)
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`
                  }}
                >
                  <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: GAP }}>
                    {rowPhotos.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setViewerIndex(indexById.get(p.id)!)}
                        className="aspect-square overflow-hidden rounded-lg border border-transparent bg-neutral-100 transition hover:border-blue-400"
                        title={p.filename}
                      >
                        <img
                          src={`photomind://thumb/${p.id}`}
                          loading="lazy"
                          alt={p.filename}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {viewerIndex !== null && photos.length > 0 && (
        <PhotoViewer photos={photos} index={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  )
}