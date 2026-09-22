import { useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { MindLibraryItem } from '@shared/types'

type ViewNodeData = { photoId: number; title: string }
type ViewNode = Node<ViewNodeData>
type ViewEdgeData = { label: string | null }
type ViewEdge = Edge<ViewEdgeData>

function ViewNodeComponent({ data }: NodeProps<ViewNode>) {
  return (
    <div className="relative h-full w-full rounded-lg border-2 border-neutral-400 bg-white">
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 20, height: 20, background: '#3b82f6', border: '2px solid #fff', zIndex: 20 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 20, height: 20, background: '#10b981', border: '2px solid #fff', zIndex: 20 }}
      />
      <div className="absolute inset-0 overflow-hidden rounded-md">
        <img
          src={`photomind://thumb/${data.photoId}`}
          alt={data.title}
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />
      </div>
      {data.title && (
        <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/60 px-2 py-0.5">
          <p className="truncate text-[11px] text-white">{data.title}</p>
        </div>
      )}
    </div>
  )
}

function ViewEdgeComponent(props: EdgeProps<ViewEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })
  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: '#94a3b8', strokeWidth: 1.5 }} />
      <EdgeLabelRenderer>
        {data?.label ? (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none'
            }}
            className="rounded-full border border-neutral-300 bg-white px-1.5 py-0.5 text-xs shadow-sm"
          >
            {data.label}
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  )
}

const viewNodeTypes: NodeTypes = { photo: ViewNodeComponent }
const viewEdgeTypes: EdgeTypes = { svg: ViewEdgeComponent }

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

// 只读查看弹窗：还原保存时的画布状态
function MindCanvasViewer({ item, onClose }: { item: MindLibraryItem; onClose: () => void }) {
  const nodes: ViewNode[] = item.snapshot.nodes.map((n, i) => ({
    id: `v-${i}`,
    type: 'photo',
    position: { x: n.x, y: n.y },
    style: { width: n.width, height: n.height },
    data: { photoId: n.photoId, title: n.name }
  }))
  const edges: ViewEdge[] = item.snapshot.edges.map((e, i) => ({
    id: `ve-${i}`,
    source: `v-${e.source}`,
    target: `v-${e.target}`,
    type: 'svg',
    data: { label: e.label }
  }))

  const [hint, setHint] = useState(false)
  const hintTimer = useRef<number | null>(null)

  const showRestrictHint = () => {
    setHint(true)
    if (hintTimer.current) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(false), 2500)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" onClick={onClose}>
      {hint && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-md bg-neutral-800/90 px-3 py-1.5 text-xs text-white shadow-lg">
          快照为只读模式，不支持连接节点
        </div>
      )}
      <div
        className="flex h-[85vh] w-[85vw] flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-neutral-800">{item.name}</h2>
            <p className="text-xs text-neutral-400">
              {item.snapshot.nodes.length} 个元素 · {item.snapshot.edges.length} 条连线 · {new Date(item.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <ReactFlowProvider>
            <ReactFlow
              defaultNodes={nodes}
              defaultEdges={edges}
              nodeTypes={viewNodeTypes}
              edgeTypes={viewEdgeTypes}
              nodesDraggable={false}
              elementsSelectable={false}
              deleteKeyCode={null}
              isValidConnection={() => false}
              onConnectStart={showRestrictHint}
              fitView
            >
              <Background />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  )
}

function LibraryImageViewer({ item, onClose }: { item: MindLibraryItem; onClose: () => void }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex h-[85vh] w-[85vw] flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-neutral-800">{item.name}</h2>
            <p className="text-xs text-neutral-400">画布图片</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-neutral-100 p-4">
          {failed ? (
            <p className="text-sm text-neutral-400">图片文件不存在或已被移动。</p>
          ) : (
            <img
              src={`photomind://lib/${encodeURIComponent(item.imageName ?? '')}`}
              alt={item.name}
              onError={() => setFailed(true)}
              className="max-h-full max-w-full rounded object-contain shadow"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function LibraryCard({
  item,
  selectMode,
  selected,
  onToggle,
  onClick,
  onContextMenu,
  onViewImage
}: {
  item: MindLibraryItem
  selectMode: boolean
  selected: boolean
  onToggle: () => void
  onClick: () => void
  onContextMenu: (e: MouseEvent) => void
  onViewImage: () => void
}) {
  const handleClick = () => {
    if (selectMode) onToggle()
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
      className={`group relative cursor-pointer rounded-lg border bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        selected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-neutral-200 hover:border-blue-400'
      }`}
    >
      {selectMode && (
        <div
          className={`absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold ${
            selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-white bg-black/40 text-transparent'
          }`}
        >
          ✓
        </div>
      )}
      <div className="mb-1 truncate pr-8 text-sm font-medium text-neutral-800">{item.name}</div>
      <div className="text-xs text-neutral-400">{new Date(item.createdAt).toLocaleString('zh-CN')}</div>
      <div className="mt-3 text-xs text-neutral-500">
        {item.snapshot.nodes.length} 个元素 · {item.snapshot.edges.length} 条连线
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onViewImage()
        }}
        disabled={!item.imageName}
        title={item.imageName ? '查看画布图片' : '无对应图片文件'}
        aria-label="查看画布图片"
        className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ImageIcon />
      </button>
    </div>
  )
}

export default function MindLibraryPage() {
  const [items, setItems] = useState<MindLibraryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [viewing, setViewing] = useState<MindLibraryItem | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; item: MindLibraryItem } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ ids: number[]; label: string } | null>(null)
  const [imageViewing, setImageViewing] = useState<MindLibraryItem | null>(null)

  const load = () => {
    setLoading(true)
    window.api
      .listMindLibrary()
      .then(setItems)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

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

  const allSelected = items.length > 0 && items.every((it) => selected.has(it.id))

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(items.map((it) => it.id)))
  }

  const batchDelete = () => {
    if (selected.size === 0) return
    openDeleteDialog([...selected], `${selected.size} 个联想画布`)
  }

  const openCtx = (e: MouseEvent, item: MindLibraryItem) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, item })
  }

  const handleDelete = (item: MindLibraryItem) => {
    setCtxMenu(null)
    openDeleteDialog([item.id], `「${item.name}」`)
  }

  const openDeleteDialog = (ids: number[], label: string) => {
    setDeleteDialog({ ids, label })
  }

  const cancelDelete = () => {
    setDeleteDialog(null)
  }

  const confirmDelete = async () => {
    if (!deleteDialog) return
    await window.api.deleteMindLibrary(deleteDialog.ids)
    setDeleteDialog(null)
    if (selectMode) exitSelect()
    // 重新加载列表
    setItems(await window.api.listMindLibrary())
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
        <h1 className="text-lg font-semibold">联想库</h1>
        <button
          onClick={selectMode ? toggleSelectAll : enterSelect}
          className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:border-neutral-400"
        >
          {selectMode ? (allSelected ? '全不选' : '全选') : '多选'}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {loading ? (
          <p className="text-sm text-neutral-400">加载中…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 py-16 text-center text-sm text-neutral-400">
            暂无保存的联想画布
            <br />
            在「联想画布」页点击右上角「保存到库」即可将画布保存到这里。
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {items.map((it) => (
              <LibraryCard
                key={it.id}
                item={it}
                selectMode={selectMode}
                selected={selected.has(it.id)}
                onToggle={() => toggleSelect(it.id)}
                onClick={() => setViewing(it)}
                onContextMenu={(e) => openCtx(e, it)}
                onViewImage={() => setImageViewing(it)}
              />
            ))}
          </div>
        )}
      </div>

      {viewing && <MindCanvasViewer item={viewing} onClose={() => setViewing(null)} />}
      {imageViewing && <LibraryImageViewer item={imageViewing} onClose={() => setImageViewing(null)} />}

      {selectMode && (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg">
          <span className="text-sm text-neutral-500">已选 {selected.size} 个</span>
          <button
            onClick={batchDelete}
            disabled={selected.size === 0}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            删除
          </button>
          <button
            onClick={exitSelect}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            取消多选
          </button>
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
              onClick={() => handleDelete(ctxMenu.item)}
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
            <p className="mb-4 text-sm text-neutral-600">即将删除 {deleteDialog.label}，此操作不可恢复。</p>
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
    </div>
  )
}