import { useEffect, useState, type MouseEvent } from 'react'
import type { Album } from '@shared/types'
import { useLibraryStore } from '../store/library'
import { AlbumCard } from '../components/AlbumCard'
import { GridSizeToggle } from '../components/GridSizeToggle'
import { CategoryDialog } from '../components/CategoryDialog'
import { AlbumDetailPage } from './AlbumDetailPage'

const GAP = 12

interface CtxMenu {
  x: number
  y: number
  album: Album
}

export default function LibraryPage() {
  const {
    photos,
    albums,
    gridColumns,
    loading,
    importing,
    lastResult,
    loadLibrary,
    loadGridColumns,
    setGridColumns,
    importFolder,
    createCategory,
    renameCategory,
    deleteCategory
  } = useLibraryStore()

  const [currentAlbum, setCurrentAlbum] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Album | null>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)

  useEffect(() => {
    loadLibrary()
    loadGridColumns()
  }, [loadLibrary, loadGridColumns])

  if (currentAlbum !== null) {
    return <AlbumDetailPage albumKey={currentAlbum} onBack={() => setCurrentAlbum(null)} />
  }

  const handleContextMenu = (e: MouseEvent<HTMLButtonElement>, album: Album) => {
    if (album.kind !== 'category') return
    setCtxMenu({ x: e.clientX, y: e.clientY, album })
  }

  const categoryId = (album: Album) => Number(album.key.replace('category:', ''))

  const handleDelete = (album: Album) => {
    setCtxMenu(null)
    if (confirm(`删除相册「${album.name}」？照片本身不会被删除。`)) {
      deleteCategory(categoryId(album))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-5 py-3">
        <button
          onClick={importFolder}
          disabled={importing}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {importing ? '导入中…' : '导入文件夹'}
        </button>
        <button
          onClick={importFolder}
          disabled={importing}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-60"
        >
          补录文件夹
        </button>
        {lastResult && (
          <span className="text-sm text-neutral-500">
            共扫描 {lastResult.total} 张（新增 {lastResult.added}，已存在 {lastResult.skipped}）
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-neutral-400">加载中…</div>
      ) : photos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-neutral-400">
          <span className="text-lg">暂无照片</span>
          <span className="text-sm">点击上方“导入文件夹”开始，导入后这里会出现相册</span>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gap: GAP }}>
            {albums.map((a) => (
              <AlbumCard key={a.key} album={a} onOpen={() => setCurrentAlbum(a.key)} onContextMenu={handleContextMenu} />
            ))}
          </div>
        </div>
      )}

      {/* 右下角浮动：新建分类（+） 与 网格列数切换 */}
      <button
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-2xl leading-none text-white shadow-lg transition-colors hover:bg-blue-700"
        aria-label="新建分类"
        title="新建分类"
      >
        +
      </button>
      <GridSizeToggle value={gridColumns} onChange={setGridColumns} />

      {/* 相册右键菜单 */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div
            className="fixed z-50 w-40 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => {
                setRenameTarget(ctxMenu.album)
                setCtxMenu(null)
              }}
              className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
            >
              重命名相册
            </button>
            <button
              onClick={() => handleDelete(ctxMenu.album)}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-neutral-100"
            >
              删除相册
            </button>
          </div>
        </>
      )}

      {/* 新建分类 */}
      {createOpen && (
        <CategoryDialog
          title="新建分类"
          confirmText="新建"
          onConfirm={(name, color) => {
            createCategory(name, color)
            setCreateOpen(false)
          }}
          onCancel={() => setCreateOpen(false)}
        />
      )}

      {/* 重命名相册 */}
      {renameTarget && (
        <CategoryDialog
          title="重命名相册"
          initialName={renameTarget.name}
          initialColor={renameTarget.color ?? undefined}
          showColor={false}
          confirmText="确定"
          onConfirm={(name) => {
            renameCategory(categoryId(renameTarget), name)
            setRenameTarget(null)
          }}
          onCancel={() => setRenameTarget(null)}
        />
      )}
    </div>
  )
}