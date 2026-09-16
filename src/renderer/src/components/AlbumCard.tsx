import type { MouseEvent } from 'react'
import type { Album } from '@shared/types'

export function AlbumCard({
  album,
  onOpen,
  onContextMenu
}: {
  album: Album
  onOpen: () => void
  onContextMenu?: (e: MouseEvent<HTMLButtonElement>, album: Album) => void
}) {
  return (
    <button
      onClick={onOpen}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault()
          onContextMenu(e, album)
        }
      }}
      className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 text-left shadow-sm transition hover:shadow-md"
    >
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-neutral-200">
        {[0, 1, 2, 3].map((i) => {
          const id = album.coverPhotoIds[i]
          return id ? (
            <img
              key={i}
              src={`photomind://thumb/${id}`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div key={i} className="h-full w-full bg-neutral-100" />
          )
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: album.color ?? '#9ca3af' }}
          />
          <span className="truncate text-sm font-medium text-white">{album.name}</span>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-white/80">{album.count}</span>
      </div>
    </button>
  )
}