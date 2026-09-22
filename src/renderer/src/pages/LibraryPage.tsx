import { useEffect, useState, type DragEvent, type MouseEvent } from 'react'
import { useLibraryStore } from '../store/library'
import type { Photo } from '@shared/types'
import { PhotoDetailPage } from './PhotoDetailPage'

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])

type SortKey = 'editedAt' | 'rating' | 'fileSize'
const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'editedAt', label: '按修改顺序排序' },
  { key: 'rating', label: '按评分排序' },
  { key: 'fileSize', label: '按文件大小排序' }
]

function PhotoCard({
  p,
  onClick,
  selectMode = false,
  selected = false,
  onToggle,
  onContextMenu
}: {
  p: Photo
  onClick: () => void
  selectMode?: boolean
  selected?: boolean
  onToggle?: () => void
  onContextMenu?: (e: MouseEvent) => void
}) {
  const handleClick = () => {
    if (selectMode && onToggle) onToggle()
    else onClick()
  }
  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-lg border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
        selected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-neutral-200'
      }`}
      title={p.filename}
    >
      <img
        src={`photomind://thumb/${p.id}`}
        alt={p.filename}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
      {selectMode && (
        <div
          className={`absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
            selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-white bg-black/40 text-transparent'
          }`}
        >
          ✓
        </div>
      )}
      {p.name && (
        <div className="absolute left-2 top-2 z-[5] max-w-[85%] truncate rounded bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white transition-opacity duration-300 group-hover:opacity-0">
          {p.name}
        </div>
      )}
      {(p.name || p.tags.length > 0) && (
        <div className="pointer-events-none absolute inset-0 z-10 flex translate-y-full flex-col bg-black/60 p-3 transition-transform duration-300 group-hover:translate-y-0">
          {p.name && <div className="truncate text-sm font-medium text-white">{p.name}</div>}
          {p.tags.length > 0 && (
            <div className={`flex flex-wrap gap-1 text-xs text-white ${p.name ? 'mt-2' : ''}`}>
              {p.tags.map((t) => (
                <span key={t} className="rounded bg-white/20 px-1.5 py-0.5">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-1 px-2 py-1.5 transition-opacity duration-300 group-hover:opacity-50">
        <div className="flex items-center text-sm leading-none">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= p.rating ? 'text-yellow-400' : 'text-neutral-300'}>
              {n <= p.rating ? '★' : '☆'}
            </span>
          ))}
        </div>
        {p.tags.length > 0 && (
          <div
            className="truncate text-xs text-neutral-500 transition-opacity duration-300 group-hover:opacity-0"
            title={p.tags.join(', ')}
          >
            {p.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
            {p.tags.length > 3 ? '…' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LibraryPage() {
  const { photos, loading, importing, lastImported, loadLibrary, importPaths, importFolder, startEditing, startBatchEditing, deletePhotos } =
    useLibraryStore()
  const [importOpen, setImportOpen] = useState(false)
  const [modalDragOver, setModalDragOver] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; photo: Photo } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ ids: number[]; label: string } | null>(null)
  const [deleteFiles, setDeleteFiles] = useState(false)
  const [detail, setDetail] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [searchMode, setSearchMode] = useState<'or' | 'and'>('or')
  const [tempOpen, setTempOpen] = useState(false)
  const [filterRatings, setFilterRatings] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('editedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [sortOpen, setSortOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  const unedited = photos.filter((p) => !p.edited)
  const edited = photos.filter((p) => p.edited)
  const tempPhotos = photos.filter((p) => {
    if (activeTags.length === 0) return false
    const has = (t: string) => p.tags.includes(t)
    return searchMode === 'and' ? activeTags.every(has) : activeTags.some(has)
  })
  const tempIds = new Set(tempPhotos.map((p) => p.id))
  const homeEdited = edited.filter((p) => !tempIds.has(p.id))

  const sorted = [...homeEdited].sort((a, b) => {
    const cmp =
      sortKey === 'rating'
        ? a.rating - b.rating
        : sortKey === 'fileSize'
          ? a.fileSize - b.fileSize
          : (a.editedAt ?? 0) - (b.editedAt ?? 0)
    return sortDir === 'asc' ? cmp : -cmp
  })
  const filtered = filterRatings.size === 0 ? sorted : sorted.filter((p) => filterRatings.has(p.rating))

  const runSearch = () => {
    const tags = searchInput.trim().split(/\s+/).filter(Boolean)
    setActiveTags([...new Set(tags)])
  }

  const toggleRating = (n: number) => {
    setFilterRatings((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const selectSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const enterSelect = () => {
    setSelectMode(true)
    setSelected(new Set())
  }

  const exitSelect = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map((p) => p.id)))
  }

  const batchDelete = () => {
    if (selected.size === 0) return
    openDeleteDialog([...selected], `${selected.size} 张照片`)
  }

  const batchEdit = () => {
    const queue = filtered.filter((p) => selected.has(p.id))
    if (!queue.length) return
    startBatchEditing(queue)
    exitSelect()
  }

  const openDetail = (list: Photo[], photo: Photo) => {
    const i = list.findIndex((x) => x.id === photo.id)
    setDetail({ photos: list, index: i >= 0 ? i : 0 })
  }

  const openCtx = (e: MouseEvent, photo: Photo) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, photo })
  }

  const handleEdit = (photo: Photo) => {
    setCtxMenu(null)
    startBatchEditing([photo])
  }

  const handleDelete = (photo: Photo) => {
    setCtxMenu(null)
    openDeleteDialog([photo.id], `「${photo.name || photo.filename}」`)
  }

  const openDeleteDialog = (ids: number[], label: string) => {
    setDeleteFiles(false)
    setDeleteDialog({ ids, label })
  }

  const cancelDelete = () => {
    setDeleteDialog(null)
    setDeleteFiles(false)
  }

  const confirmDelete = async () => {
    if (!deleteDialog) return
    const res = await deletePhotos(deleteDialog.ids, deleteFiles)
    setDeleteDialog(null)
    setDeleteFiles(false)
    if (selectMode) exitSelect()
    if (res.fileErrors > 0) {
      window.alert(`${res.fileErrors} 个本地文件删除失败（可能已被移动或占用），照片记录已删除。`)
    }
  }

  const handleModalDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setModalDragOver(false)
    const paths: string[] = []
    for (const f of Array.from(e.dataTransfer.files)) {
      if (paths.length >= 10) break
      const p = window.getPathForFile(f)
      const ext = p.toLowerCase().match(/\.[a-z0-9]+$/)?.[0]
      if (p && ext && SUPPORTED.has(ext)) paths.push(p)
    }
    if (paths.length) {
      setImportOpen(false)
      importPaths(paths)
    }
  }

  const handleImportFolder = () => {
    setImportOpen(false)
    importFolder()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-5 py-3">
        <button
          onClick={() => startEditing(unedited)}
          disabled={unedited.length === 0}
          title={`未分类（${unedited.length} 张）`}
          className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md border-2 border-dashed border-neutral-300 bg-white leading-none text-neutral-600 transition hover:border-blue-400 disabled:cursor-default disabled:opacity-50"
        >
          <span className="text-[9px] font-medium text-neutral-500">未分类</span>
          <span className="mt-0.5 text-xs font-semibold text-neutral-700">{unedited.length}</span>
        </button>
        <button
          onClick={() => setImportOpen(true)}
          disabled={importing}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {importing ? '导入中…' : '导入照片'}
        </button>
        {lastImported.length > 0 && (
          <button
            onClick={() => startEditing(lastImported)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            导入完毕
          </button>
        )}
        <span className="text-sm text-neutral-400">单次最多导入 10 张，也可直接拖入照片</span>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-neutral-400">加载中…</div>
      ) : photos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-neutral-400">
          <span className="text-lg">暂无照片</span>
          <span className="text-sm">点击「导入照片」或直接拖入照片开始</span>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSearchMode((m) => (m === 'or' ? 'and' : 'or'))}
              title={searchMode === 'or' ? '并集搜索（任一标签）' : '交集搜索（全部标签）'}
              className={`h-9 min-w-9 rounded-md border px-2 text-sm font-medium transition-colors duration-300 ${
                searchMode === 'or' ? 'border-neutral-300 bg-white text-black' : 'border-black bg-black text-white'
              }`}
            >
              {searchMode === 'or' ? '阳' : '阴'}
            </button>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch()
              }}
              placeholder="输入标签搜索，空格分隔多个，如：风景 旅行"
              className="w-64 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={runSearch}
              className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              搜索
            </button>
            {activeTags.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span>
                  标签「{activeTags.map((t) => `#${t}`).join(' ')}」（{searchMode === 'or' ? '任一' : '全部'}）匹配 {tempPhotos.length}{' '}
                  张，已移入临时相册，首页不再显示
                </span>
                <button onClick={() => setActiveTags([])} className="text-blue-600 hover:underline">
                  清除临时相册
                </button>
              </div>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="mr-1 text-sm text-neutral-500">筛选</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => toggleRating(n)}
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                      filterRatings.has(n)
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
                        : 'border-neutral-300 bg-white text-neutral-500 hover:border-neutral-400'
                    }`}
                  >
                    {n}★
                  </button>
                ))}
                {filterRatings.size > 0 && (
                  <button onClick={() => setFilterRatings(new Set())} className="text-xs text-blue-600 hover:underline">
                    清除
                  </button>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:border-neutral-400"
                >
                  排序 ▾
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                      {SORT_OPTIONS.map((o) => (
                        <button
                          key={o.key}
                          onClick={() => selectSort(o.key)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                        >
                          <span>{o.label}</span>
                          <span className="text-xs text-neutral-500">
                            {sortKey === o.key ? (sortDir === 'asc' ? '↑ 正序' : '↓ 倒序') : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={selectMode ? toggleSelectAll : enterSelect}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:border-neutral-400"
              >
                {selectMode ? (allSelected ? '全不选' : '全选') : '多选'}
              </button>
            </div>
          </div>

          <div className="mb-2 text-sm font-medium text-neutral-500">已完成（平铺）</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {activeTags.length > 0 && (
              <div
                onClick={() => setTempOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setTempOpen(true)
                }}
                className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                title={`临时相册 ${activeTags.map((t) => `#${t}`).join(' ')}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTags([])
                  }}
                  className="absolute right-1.5 top-1.5 z-20 rounded-full bg-black/50 px-1.5 py-0.5 text-xs leading-none text-white hover:bg-black/70"
                  title="删除临时相册"
                >
                  ×
                </button>
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-blue-50 to-indigo-100">
                  <span className="text-2xl leading-none text-blue-500">#</span>
                  <span className="max-w-full truncate px-2 text-center text-sm font-medium text-blue-700">
                    {activeTags.map((t) => `#${t}`).join(' ')}
                  </span>
                </div>
                <div className="px-2 py-1.5">
                  <div className="truncate text-xs text-neutral-600">
                    {searchMode === 'or' ? '任一标签' : '全部标签'}
                  </div>
                  <div className="text-xs text-neutral-400">{tempPhotos.length} 张</div>
                </div>
              </div>
            )}
            {filtered.map((p) => (
              <PhotoCard
                key={p.id}
                p={p}
                onClick={() => openDetail(filtered, p)}
                selectMode={selectMode}
                selected={selected.has(p.id)}
                onToggle={() => toggleSelect(p.id)}
                onContextMenu={(e) => openCtx(e, p)}
              />
            ))}
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setImportOpen(false)}>
          <div className="w-[520px] max-w-[90vw] rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-800">导入照片</h2>
              <button
                onClick={() => setImportOpen(false)}
                className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setModalDragOver(true)
              }}
              onDragLeave={() => setModalDragOver(false)}
              onDrop={handleModalDrop}
              className={`flex h-48 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
                modalDragOver ? 'border-blue-500 bg-blue-50' : 'border-neutral-300 bg-neutral-50'
              }`}
            >
              <span className="text-neutral-500">将照片拖放到此区域完成导入</span>
              <span className="text-xs text-neutral-400">拖放方式单次最多 10 张</span>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={handleImportFolder}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                选择文件夹
              </button>
              <button
                onClick={() => setImportOpen(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {selectMode && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-sm text-neutral-500">已选 {selected.size} 张</span>
          <button
            onClick={batchDelete}
            disabled={selected.size === 0}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            删除
          </button>
          <button
            onClick={batchEdit}
            disabled={selected.size === 0}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            编辑
          </button>
          <button
            onClick={exitSelect}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            取消多选
          </button>
        </div>
      )}

      {tempOpen && activeTags.length > 0 && (
        <div className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-neutral-900 text-neutral-100">
          <div className="flex shrink-0 items-center gap-3 border-b border-neutral-700 px-5 py-3">
            <button
              onClick={() => setTempOpen(false)}
              className="rounded-md border border-neutral-600 px-3 py-1.5 text-sm text-neutral-200 transition-colors hover:bg-neutral-800"
            >
              ← 返回
            </button>
            <span className="text-sm font-medium text-neutral-300">
              临时相册 · {activeTags.map((t) => `#${t}`).join(' ')}（{tempPhotos.length} 张）
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {tempPhotos.map((p) => (
                <PhotoCard key={p.id} p={p} onClick={() => openDetail(tempPhotos, p)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setCtxMenu(null)
            }}
          />
          <div
            className="fixed z-50 w-28 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => handleEdit(ctxMenu.photo)}
              className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
            >
              编辑
            </button>
            <button
              onClick={() => handleDelete(ctxMenu.photo)}
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-neutral-100"
            >
              删除
            </button>
          </div>
        </>
      )}

      {deleteDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={cancelDelete}>
          <div className="w-[380px] max-w-[90vw] rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-base font-semibold text-neutral-800">确认删除</h2>
            <p className="mb-4 text-sm text-neutral-600">即将删除 {deleteDialog.label}，此操作会移除照片库中的记录。</p>
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={deleteFiles}
                onChange={(e) => setDeleteFiles(e.target.checked)}
                className="h-4 w-4 accent-red-600"
              />
              同时删除本地文件
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && <PhotoDetailPage photos={detail.photos} index={detail.index} onBack={() => setDetail(null)} />}
    </div>
  )
}