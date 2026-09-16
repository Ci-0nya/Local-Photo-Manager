import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  NodeResizer,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useNodesState,
  useEdgesState,
  useReactFlow,
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

type PhotoNodeData = { photoId: number; title: string }
type PhotoFlowNode = Node<PhotoNodeData>

type LabeledEdgeData = { label: string | null }
type LabeledFlowEdge = Edge<LabeledEdgeData>

function PhotoNode({ id, data, selected }: NodeProps<PhotoFlowNode>) {
  const { deleteElements } = useReactFlow()

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-lg border-2 border-neutral-300 bg-white">
      <NodeResizer
        minWidth={80}
        minHeight={60}
        isVisible={selected}
        onResizeEnd={(_e, params) => {
          window.api.updateCanvasNode(Number(id), {
            x: params.x,
            y: params.y,
            width: params.width,
            height: params.height
          })
        }}
      />
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: '#3b82f6', border: '2px solid #fff' }} />
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: '#10b981', border: '2px solid #fff' }} />
      <img
        src={`photomind://thumb/${data.photoId}`}
        alt={data.title}
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-0.5">
        <p className="truncate text-[11px] text-white">{data.title}</p>
      </div>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => deleteElements({ nodes: [{ id }] })}
        className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs leading-none text-white group-hover:flex"
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

function PhotoSidebar() {
  const photos = useLibraryStore((s) => s.photos)

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="shrink-0 border-b border-neutral-100 px-3 py-2 text-sm font-medium text-neutral-600">照片库</div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {photos.length === 0 ? (
          <p className="p-2 text-xs text-neutral-400">请先到「照片库」导入照片</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((p) => (
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

function CanvasFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<PhotoFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<LabeledFlowEdge>([])
  const { screenToFlowPosition } = useReactFlow()
  const photos = useLibraryStore((s) => s.photos)

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
      const title = photo?.filename ?? ''
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
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

export default function CanvasPage() {
  const loadLibrary = useLibraryStore((s) => s.loadLibrary)

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  return (
    <div className="flex h-full">
      <ReactFlowProvider>
        <PhotoSidebar />
        <CanvasFlow />
      </ReactFlowProvider>
    </div>
  )
}