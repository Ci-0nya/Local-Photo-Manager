import { useEffect, useState, type WheelEvent } from 'react'
import type { PhotoExif } from '@shared/types'
import { useLibraryStore } from '../store/library'

export function EditorPage() {
  const editor = useLibraryStore((s) => s.editor)
  const finishCurrent = useLibraryStore((s) => s.finishCurrent)
  const takeBreak = useLibraryStore((s) => s.takeBreak)
  const closeEditor = useLibraryStore((s) => s.closeEditor)
  const editorPrev = useLibraryStore((s) => s.editorPrev)
  const editorNext = useLibraryStore((s) => s.editorNext)
  const setPhotoTags = useLibraryStore((s) => s.setPhotoTags)
  const saveRating = useLibraryStore((s) => s.setRating)
  const saveName = useLibraryStore((s) => s.setPhotoName)

  const current = editor ? editor.queue[editor.index] : undefined
  const mode = editor?.mode

  const [tags, setTags] = useState<string[]>(current?.tags ?? [])
  const [draft, setDraft] = useState('')
  const [exif, setExif] = useState<PhotoExif>({})
  const [scale, setScale] = useState(1)
  const [rating, setRatingLocal] = useState<number>(current?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [name, setNameLocal] = useState<string>(current?.name ?? '')

  const currentId = current?.id

  useEffect(() => {
    if (currentId == null) return
    setTags(editor?.queue.find((p) => p.id === currentId)?.tags ?? [])
    setRatingLocal(editor?.queue.find((p) => p.id === currentId)?.rating ?? 0)
    setNameLocal(editor?.queue.find((p) => p.id === currentId)?.name ?? '')
    setHover(0)
    setDraft('')
    setScale(1)
    setExif({})
    window.api.readExif(currentId).then(setExif)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') takeBreak()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [takeBreak])

  if (!editor || !current) return null

  const commitTags = (next: string[]) => {
    setTags(next)
    setPhotoTags(current.id, next)
  }

  const addTag = () => {
    const t = draft.trim()
    setDraft('')
    if (!t || tags.includes(t)) return
    commitTags([...tags, t])
  }

  const updateTag = (i: number, v: string) => {
    const next = tags.slice()
    next[i] = v
    commitTags(next)
  }

  const removeTag = (i: number) => {
    commitTags(tags.filter((_, idx) => idx !== i))
  }

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    setScale((s) => Math.min(8, Math.max(1, s * factor)))
  }

  const rows: Array<[string, string | undefined]> = [
    ['拍摄时间', exif.takenAt],
    ['快门速度', exif.shutter],
    ['ISO', exif.iso],
    ['光圈', exif.aperture],
    ['闪光灯', exif.flash]
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900 text-neutral-100">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-700 px-5 py-3">
        <span className="truncate text-sm font-medium">{current.filename}</span>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm tabular-nums text-neutral-400">
            {editor.index + 1} / {editor.queue.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={editorPrev}
              disabled={editor.index === 0}
              className="rounded border border-neutral-600 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
            >
              ‹ 上一张
            </button>
            <button
              onClick={editorNext}
              disabled={editor.index >= editor.queue.length - 1}
              className="rounded border border-neutral-600 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
            >
              下一张 ›
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 overflow-y-auto border-r border-neutral-700 p-4">
          <h3 className="mb-3 text-sm font-medium text-neutral-300">照片信息</h3>
          <dl className="space-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-neutral-500">{k}</dt>
                <dd className="break-words text-neutral-200">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <div
          className="flex min-w-0 flex-1 items-center justify-center overflow-hidden p-6"
          onWheel={onWheel}
          onDoubleClick={() => setScale(1)}
        >
          <img
            src={`photomind://photo/${current.id}`}
            alt={current.filename}
            draggable={false}
            className="select-none"
            style={{ maxWidth: '100%', maxHeight: '100%', transform: `scale(${scale})` }}
          />
        </div>

        <aside className="flex w-60 shrink-0 flex-col border-l border-neutral-700 p-4">
          <h3 className="mb-2 text-sm font-medium text-neutral-300">照片名称</h3>
          <input
            value={name}
            onChange={(e) => setNameLocal(e.target.value)}
            onBlur={() => saveName(current.id, name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveName(current.id, name)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            placeholder="请输入照片名称"
            className="mb-4 w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
          <h3 className="mb-3 text-sm font-medium text-neutral-300">标签</h3>
          <div className="mb-3 space-y-2">
            {tags.map((t, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  value={t}
                  onChange={(e) => updateTag(i, e.target.value)}
                  className="min-w-0 flex-1 rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => removeTag(i)}
                  className="shrink-0 rounded px-1.5 text-neutral-400 hover:text-red-400"
                  aria-label="删除标签"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTag()
              }}
              placeholder="添加标签"
              className="min-w-0 flex-1 rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={addTag}
              className="shrink-0 rounded border border-neutral-600 px-2 py-1 text-sm text-neutral-200 hover:bg-neutral-700"
            >
              添加
            </button>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-neutral-300">评分</h3>
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= (hover || rating)
                return (
                  <button
                    key={n}
                    onClick={() => {
                      setRatingLocal(n)
                      saveRating(current.id, n)
                    }}
                    onMouseEnter={() => setHover(n)}
                    className="text-3xl leading-none transition-colors"
                    style={{ color: active ? '#facc15' : '#525252' }}
                    aria-label={`${n} 星`}
                  >
                    {active ? '★' : '☆'}
                  </button>
                )
              })}
            </div>
            {rating > 0 && <div className="mt-1 text-xs text-neutral-400">{rating} 星</div>}
          </div>
        </aside>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-700 px-5 py-3">
        {mode === 'batch' ? (
          <button
            onClick={closeEditor}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            处理完毕
          </button>
        ) : (
          <>
            <button
              onClick={takeBreak}
              className="rounded-md border border-neutral-600 px-5 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              休息
            </button>
            <button
              onClick={finishCurrent}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              处理完毕
            </button>
          </>
        )}
      </div>
    </div>
  )
}