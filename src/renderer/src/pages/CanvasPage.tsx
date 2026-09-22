import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Panel,
  ControlButton,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  useStoreApi,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes,
  type Connection
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useLibraryStore } from '../store/library'
import { create } from 'zustand'
import type { Photo, MindCanvasSnapshot } from '@shared/types'

type PhotoNodeData = { photoId: number; title: string }
type PhotoFlowNode = Node<PhotoNodeData>

type LabeledEdgeData = { label: string | null }
type LabeledFlowEdge = Edge<LabeledEdgeData>

function PhotoNode({ id, data }: NodeProps<PhotoFlowNode>) {
  const { deleteElements } = useReactFlow()
  const photos = useLibraryStore((s) => s.photos)
  const name = photos.find((p) => p.id === data.photoId)?.name ?? ''

  return (
    <div className="group relative h-full w-full rounded-lg border-2 border-neutral-400 bg-white">
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

      {name && (
        <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/60 px-2 py-0.5">
          <p className="truncate text-[11px] text-white">{name}</p>
        </div>
      )}

      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => deleteElements({ nodes: [{ id }] })}
        className="absolute -right-2 -top-2 z-20 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs leading-none text-white group-hover:flex"
        aria-label="删除节点"
      >
        ×
      </button>
    </div>
  )
}

function LabeledEdge(props: EdgeProps<LabeledFlowEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })
  const { updateEdgeData, deleteElements } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const label = data?.label ?? ''

  const startEdit = () => {
    setDraft(label)
    setEditing(true)
  }

  const commit = () => {
    const value = draft.trim()
    updateEdgeData(id, { label: value || null })
    window.api.updateCanvasEdge(Number(id), { label: value || null })
    setEditing(false)
  }

  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: selected ? '#3b82f6' : '#94a3b8', strokeWidth: selected ? 2 : 1.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all'
          }}
          className="nodrag nopan flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-1.5 py-0.5 text-xs shadow-sm"
        >
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') setEditing(false)
              }}
              className="w-24 rounded border border-blue-400 px-1 text-xs focus:outline-none"
            />
          ) : (
            <button onClick={startEdit} className="max-w-[120px] truncate text-neutral-700" title="点击编辑标签">
              {label || '＋ 标签'}
            </button>
          )}
          <button
            onClick={() => deleteElements({ edges: [{ id }] })}
            className="text-neutral-400 hover:text-red-600"
            aria-label="删除连线"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes: NodeTypes = { photo: PhotoNode }
const edgeTypes: EdgeTypes = { labeled: LabeledEdge }

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <path d="M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 5">
      <path d="M0 0h32v4.2H0z" />
    </svg>
  )
}

function FitViewIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 30">
      <path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 32">
      <path d="M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 32">
      <path d="M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" />
    </svg>
  )
}

function AutoLayoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <path d="M2 2h12v12H2zM18 2h12v12H18zM2 18h12v12H2zM18 18h12v12H18z" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

// 自动整理：按连线方向做分层布局（源节点居左、目标节点居右），同层纵向排布，保证间距均匀
function computeAutoLayout(
  nodes: PhotoFlowNode[],
  edges: LabeledFlowEdge[]
): Map<string, { x: number; y: number }> {
  const nodeW = (n: PhotoFlowNode): number => Number((n.width as number | undefined) ?? (n.style as { width?: number } | undefined)?.width ?? 180) || 180
  const nodeH = (n: PhotoFlowNode): number => Number((n.height as number | undefined) ?? (n.style as { height?: number } | undefined)?.height ?? 180) || 180

  const ids = new Set(nodes.map((n) => n.id))
  const adj = new Map<string, string[]>()
  const indeg = new Map<string, number>()
  for (const n of nodes) {
    adj.set(n.id, [])
    indeg.set(n.id, 0)
  }
  for (const e of edges) {
    if (e.source === e.target || !ids.has(e.source) || !ids.has(e.target)) continue
    adj.get(e.source)!.push(e.target)
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1)
  }

  // Kahn 拓扑分层：源节点第 0 层，随后逐层向右
  const layer = new Map<string, number>()
  const indegLeft = new Map(indeg)
  const queue: string[] = []
  for (const n of nodes) {
    if ((indegLeft.get(n.id) ?? 0) === 0) {
      layer.set(n.id, 0)
      queue.push(n.id)
    }
  }
  while (queue.length) {
    const id = queue.shift()!
    const l = layer.get(id) ?? 0
    for (const t of adj.get(id) ?? []) {
      const d = (indegLeft.get(t) ?? 1) - 1
      indegLeft.set(t, d)
      if (d === 0 && !layer.has(t)) {
        layer.set(t, l + 1)
        queue.push(t)
      }
    }
  }
  // 环路/孤立残留节点放到最右侧新层
  let maxLayer = 0
  for (const l of layer.values()) maxLayer = Math.max(maxLayer, l)
  for (const n of nodes) if (!layer.has(n.id)) layer.set(n.id, maxLayer + 1)

  const columns = new Map<number, PhotoFlowNode[]>()
  for (const n of nodes) {
    const l = layer.get(n.id) ?? 0
    if (!columns.has(l)) columns.set(l, [])
    columns.get(l)!.push(n)
  }

  let maxW = 180
  for (const n of nodes) maxW = Math.max(maxW, nodeW(n))

  const GAP_X = 120
  const GAP_Y = 100
  const START = 40
  const positions = new Map<string, { x: number; y: number }>()
  const layers = [...columns.keys()].sort((a, b) => a - b)
  for (const l of layers) {
    const col = columns.get(l)!.slice().sort((a, b) => a.position.y - b.position.y)
    const x = START + l * (maxW + GAP_X)
    let y = START
    for (const n of col) {
      positions.set(n.id, { x, y })
      y += nodeH(n) + GAP_Y
    }
  }
  return positions
}

// 自定义画布控制面板：放大 / 缩小 / 适应视图 / 自动整理 / 锁定交互
function CanvasControls() {
  const { zoomIn, zoomOut, fitView, getNodes, getEdges, setNodes } = useReactFlow<PhotoFlowNode, LabeledFlowEdge>()
  const store = useStoreApi()
  const zoom = useStore((s) => s.transform[2])
  const minZoom = useStore((s) => s.minZoom)
  const maxZoom = useStore((s) => s.maxZoom)
  const nodesDraggable = useStore((s) => s.nodesDraggable)
  const nodesConnectable = useStore((s) => s.nodesConnectable)
  const elementsSelectable = useStore((s) => s.elementsSelectable)

  const isInteractive = nodesDraggable || nodesConnectable || elementsSelectable

  const toggleInteractive = () => {
    const v = !isInteractive
    store.setState({ nodesDraggable: v, nodesConnectable: v, elementsSelectable: v })
  }

  const autoLayout = () => {
    const ns = getNodes()
    const es = getEdges()
    if (!ns.length) return
    const positions = computeAutoLayout(ns, es)
    setNodes((nds) => nds.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n)))
    for (const [id, pos] of positions) {
      window.api.updateCanvasNode(Number(id), { x: pos.x, y: pos.y })
    }
    requestAnimationFrame(() => {
      fitView({ padding: 0.15 })
    })
  }

  return (
    <Panel position="bottom-left" className="react-flow__controls">
      <ControlButton onClick={() => zoomIn()} disabled={zoom >= maxZoom} title="放大" aria-label="放大">
        <PlusIcon />
      </ControlButton>
      <ControlButton onClick={() => zoomOut()} disabled={zoom <= minZoom} title="缩小" aria-label="缩小">
        <MinusIcon />
      </ControlButton>
      <ControlButton onClick={() => fitView()} title="适应视图" aria-label="适应视图">
        <FitViewIcon />
      </ControlButton>
      <ControlButton onClick={autoLayout} title="自动整理联想画布" aria-label="自动整理联想画布">
        <AutoLayoutIcon />
      </ControlButton>
      <ControlButton
        onClick={toggleInteractive}
        title={isInteractive ? '锁定画布' : '解锁画布'}
        aria-label="切换交互"
      >
        {isInteractive ? <UnlockIcon /> : <LockIcon />}
      </ControlButton>
    </Panel>
  )
}

function PhotoSidebar({ placedIds }: { placedIds: Set<number> }) {
  const photos = useLibraryStore((s) => s.photos)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'or' | 'and'>('or')

  const tags = query.trim().split(/\s+/).filter(Boolean)
  const edited = photos.filter((p) => p.edited && !placedIds.has(p.id))
  const shown = edited.filter((p) => {
    if (tags.length === 0) return true
    const has = (t: string) => p.tags.includes(t)
    return mode === 'and' ? tags.every(has) : tags.some(has)
  })

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="shrink-0 border-b border-neutral-100 px-3 py-2 text-sm font-medium text-neutral-600">照片库</div>
      <div className="shrink-0 border-b border-neutral-100 px-2 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode((m) => (m === 'or' ? 'and' : 'or'))}
            title={mode === 'or' ? '并集（任一标签）' : '交集（全部标签）'}
            className={`h-6 w-6 shrink-0 rounded text-xs font-medium transition-colors duration-300 ${
              mode === 'or' ? 'border border-neutral-300 bg-white text-black' : 'border border-black bg-black text-white'
            }`}
          >
            {mode === 'or' ? '阳' : '阴'}
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标签"
            className="h-6 min-w-0 flex-1 rounded border border-neutral-300 px-1.5 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {shown.length === 0 ? (
          <p className="p-2 text-xs text-neutral-400">{edited.length === 0 ? '暂无已分类照片' : '无匹配照片'}</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {shown.map((p) => (
              <img
                key={p.id}
                src={`photomind://thumb/${p.id}`}
                alt={p.filename}
                title={p.filename}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/photomind', String(p.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className="aspect-square w-full cursor-grab rounded object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function CanvasFlow({ onPlacedChange }: { onPlacedChange: (ids: Set<number>) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PhotoFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<LabeledFlowEdge>([])
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow<PhotoFlowNode, LabeledFlowEdge>()
  const photos = useLibraryStore((s) => s.photos)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const pendingSnapshot = useRef<MindCanvasSnapshot | null>(null)
  const [clearOpen, setClearOpen] = useState(false)

  useEffect(() => {
    onPlacedChange(new Set(nodes.map((n) => n.data.photoId)))
  }, [nodes, onPlacedChange])

  useEffect(() => {
    Promise.all([window.api.getCanvasNodes(), window.api.getCanvasEdges()]).then(([mapNodes, mapEdges]) => {
      setNodes(
        mapNodes.map((n) => ({
          id: String(n.id),
          type: 'photo',
          position: { x: n.x, y: n.y },
          style: { width: n.width, height: n.height },
          data: { photoId: n.photoId, title: n.title ?? '' }
        }))
      )
      setEdges(
        mapEdges.map((e) => ({
          id: String(e.id),
          source: String(e.sourceNodeId),
          target: String(e.targetNodeId),
          type: 'labeled',
          data: { label: e.label }
        }))
      )
    })
  }, [setNodes, setEdges])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const photoId = Number(e.dataTransfer.getData('application/photomind'))
      if (!photoId) return

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const photo = photos.find((p) => p.id === photoId)
      const title = photo?.name ?? ''
      const width = 180
      const height = 180

      window.api.createCanvasNode(photoId, position.x, position.y, width, height, title).then((created) => {
        setNodes((nds) =>
          nds.concat({
            id: String(created.id),
            type: 'photo',
            position: { x: created.x, y: created.y },
            style: { width: created.width, height: created.height },
            data: { photoId: created.photoId, title: created.title ?? '' }
          })
        )
      })
    },
    [screenToFlowPosition, photos, setNodes]
  )

  const onNodeDragStop = useCallback((_e: MouseEvent | TouchEvent, node: PhotoFlowNode) => {
    window.api.updateCanvasNode(Number(node.id), { x: node.position.x, y: node.position.y })
  }, [])

  const onNodeDoubleClick = useCallback((_e: React.MouseEvent, node: PhotoFlowNode) => {
    useCanvasViewer.getState().open(node.data.photoId)
  }, [])

  const onNodesDelete = useCallback((deleted: PhotoFlowNode[]) => {
    for (const n of deleted) window.api.deleteCanvasNode(Number(n.id))
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNodeId = Number(connection.source)
      const targetNodeId = Number(connection.target)
      if (!sourceNodeId || !targetNodeId) return

      window.api.createCanvasEdge(sourceNodeId, targetNodeId, null).then((created) => {
        setEdges((eds) =>
          eds.concat({
            id: String(created.id),
            source: String(created.sourceNodeId),
            target: String(created.targetNodeId),
            type: 'labeled',
            data: { label: created.label }
          })
        )
      })
    },
    [setEdges]
  )

  const onEdgesDelete = useCallback((deleted: LabeledFlowEdge[]) => {
    for (const e of deleted) window.api.deleteCanvasEdge(Number(e.id))
  }, [])

  const openSaveDialog = useCallback(() => {
    const ns = getNodes()
    const es = getEdges()
    if (!ns.length) return
    const idToIndex = new Map(ns.map((n, i) => [n.id, i]))
    pendingSnapshot.current = {
      nodes: ns.map((n) => ({
        photoId: n.data.photoId,
        name: photos.find((p) => p.id === n.data.photoId)?.name ?? '',
        x: n.position.x,
        y: n.position.y,
        width: Number((n.width as number | undefined) ?? (n.style as { width?: number } | undefined)?.width ?? 180) || 180,
        height: Number((n.height as number | undefined) ?? (n.style as { height?: number } | undefined)?.height ?? 180) || 180
      })),
      edges: es
        .map((e) => ({
          source: idToIndex.get(e.source) ?? -1,
          target: idToIndex.get(e.target) ?? -1,
          label: e.data?.label ?? null
        }))
        .filter((e) => e.source >= 0 && e.target >= 0)
    }
    setSaveName(`联想画布 ${new Date().toLocaleString('zh-CN')}`)
    setSaveOpen(true)
  }, [getNodes, getEdges, photos])

  const confirmSave = useCallback(async () => {
    if (!pendingSnapshot.current) return
    const name = saveName.trim() || `联想画布 ${new Date().toLocaleString('zh-CN')}`
    await window.api.saveMindLibrary(name, pendingSnapshot.current)
    pendingSnapshot.current = null
    setSaveOpen(false)
  }, [saveName])

  const cancelSave = useCallback(() => {
    pendingSnapshot.current = null
    setSaveOpen(false)
  }, [])

  const openClearDialog = useCallback(() => {
    if (getNodes().length === 0 && getEdges().length === 0) {
      window.alert('画布已为空。')
      return
    }
    setClearOpen(true)
  }, [getNodes, getEdges])

  const confirmClear = useCallback(async () => {
    await window.api.clearCanvas()
    setClearOpen(false)
    setNodes([])
    setEdges([])
  }, [setNodes, setEdges])

  const cancelClear = useCallback(() => setClearOpen(false), [])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
      >
        <Background />
        <Panel position="top-right">
          <div className="flex items-center gap-2">
            <button
              onClick={openSaveDialog}
              disabled={nodes.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SaveIcon />
              保存到库
            </button>
            <button
              onClick={openClearDialog}
              className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-800"
            >
              <TrashIcon />
              清理画布
            </button>
          </div>
        </Panel>
        <CanvasControls />
      </ReactFlow>

      {saveOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={cancelSave}>
          <div className="w-[420px] rounded-lg bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-base font-semibold text-neutral-800">保存到联想库</h3>
            <p className="mb-3 text-sm text-neutral-600">为本次保存的画布命名：</p>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmSave()
                if (e.key === 'Escape') cancelSave()
              }}
              placeholder="请输入名称（留空将使用默认名称）"
              className="mb-4 w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelSave}
                className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={confirmSave}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {clearOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={cancelClear}>
          <div className="w-[420px] rounded-lg bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-base font-semibold text-neutral-800">确认清理画布？</h3>
            <p className="mb-4 text-sm text-neutral-600">
              此操作将清除画布上的所有元素、连线与文本，恢复为空白状态，且不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelClear}
                className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={confirmClear}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                确认清理
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const useCanvasViewer = create<{ photoId: number | null; open: (id: number) => void; close: () => void }>((set) => ({
  photoId: null,
  open: (id) => set({ photoId: id }),
  close: () => set({ photoId: null })
}))

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function CanvasImageViewer({ photoId, onClose }: { photoId: number; onClose: () => void }) {
  const photos = useLibraryStore((s) => s.photos)
  const photo = photos.find((p) => p.id === photoId)
  const [view, setView] = useState({ s: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinchStart = useRef<{ dist: number; scale: number; ox: number; oy: number; mx: number; my: number } | null>(null)

  const setViewSync = (v: { s: number; x: number; y: number }) => {
    viewRef.current = v
    setView(v)
  }

  const clampOffset = (s: number, x: number, y: number) => {
    if (s <= 1) return { x: 0, y: 0 }
    const stage = stageRef.current
    const img = imgRef.current
    if (!stage || !img) return { x, y }
    const maxX = Math.max(0, (img.clientWidth * s - stage.clientWidth) / 2)
    const maxY = Math.max(0, (img.clientHeight * s - stage.clientHeight) / 2)
    return { x: clampNum(x, -maxX, maxX), y: clampNum(y, -maxY, maxY) }
  }

  const reset = () => setViewSync({ s: 1, x: 0, y: 0 })

  useEffect(() => {
    reset()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId])

  const onWheel = (e: React.WheelEvent) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const v = viewRef.current
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const ns = clampNum(v.s * factor, 1, 8)
    const k = ns / v.s
    const { x, y } = clampOffset(ns, v.x - (mx - rect.width / 2 - v.x) * (k - 1), v.y - (my - rect.height / 2 - v.y) * (k - 1))
    setViewSync({ s: ns, x, y })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const stage = stageRef.current
    if (!stage) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const rect = stage.getBoundingClientRect()
    pointers.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top })
    stage.setPointerCapture(e.pointerId)
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, ox: viewRef.current.x, oy: viewRef.current.y }
    } else if (pointers.current.size === 2) {
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

    if (pinchStart.current && pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const p = pinchStart.current
      const ns = clampNum(p.scale * (dist / p.dist), 1, 8)
      const k = ns / p.scale
      const { x, y } = clampOffset(ns, p.ox - (p.mx - rect.width / 2 - p.ox) * (k - 1), p.oy - (p.my - rect.height / 2 - p.oy) * (k - 1))
      setViewSync({ s: ns, x, y })
    } else if (dragStart.current) {
      const v = viewRef.current
      const { x, y } = clampOffset(v.s, dragStart.current.ox + (e.clientX - dragStart.current.x), dragStart.current.oy + (e.clientY - dragStart.current.y))
      setViewSync({ s: v.s, x, y })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchStart.current = null
    if (pointers.current.size === 0) dragStart.current = null
  }

  if (!photo) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70"
        aria-label="关闭"
      >
        ×
      </button>
      <div
        ref={stageRef}
        className="relative flex h-full w-full touch-none select-none items-center justify-center overflow-hidden"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={reset}
      >
        <img
          ref={imgRef}
          src={`photomind://photo/${photo.id}`}
          alt={photo.name || photo.filename}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
            transformOrigin: 'center center'
          }}
        />
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-xs text-neutral-300">
          {Math.round(view.s * 100)}% · 滚轮/双指缩放 · 拖拽移动 · 双击复位
        </div>
      </div>
    </div>
  )
}

export default function CanvasPage() {
  const loadLibrary = useLibraryStore((s) => s.loadLibrary)
  const [placedIds, setPlacedIds] = useState<Set<number>>(new Set())
  const viewerPhotoId = useCanvasViewer((s) => s.photoId)

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  const handlePlacedChange = useCallback((ids: Set<number>) => setPlacedIds(ids), [])

  return (
    <div className="flex h-full">
      <ReactFlowProvider>
        <PhotoSidebar placedIds={placedIds} />
        <CanvasFlow onPlacedChange={handlePlacedChange} />
      </ReactFlowProvider>
      {viewerPhotoId != null && (
        <CanvasImageViewer photoId={viewerPhotoId} onClose={() => useCanvasViewer.getState().close()} />
      )}
    </div>
  )
}