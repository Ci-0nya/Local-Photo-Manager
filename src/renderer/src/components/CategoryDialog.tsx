import { useState } from 'react'

const PALETTE = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280']
const DEFAULT_COLOR = PALETTE[0]

export function CategoryDialog({
  title,
  initialName = '',
  initialColor = DEFAULT_COLOR,
  showColor = true,
  confirmText = '确定',
  onConfirm,
  onCancel
}: {
  title: string
  initialName?: string
  initialColor?: string
  showColor?: boolean
  confirmText?: string
  onConfirm: (name: string, color: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)

  const submit = () => {
    const n = name.trim()
    if (!n) return
    onConfirm(n, color)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="w-[420px] max-w-[90vw] rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold">{title}</h2>

        {showColor && (
          <div className="mb-3 flex items-center gap-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full ${color === c ? 'ring-2 ring-neutral-400 ring-offset-1' : ''}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        )}

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="分类名称"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}