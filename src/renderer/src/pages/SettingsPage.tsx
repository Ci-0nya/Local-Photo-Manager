import { useEffect, useState } from 'react'
import type { SaveDirProgress } from '@shared/ipc'
import { useLibraryStore } from '../store/library'

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function SettingsPage() {
  const [currentDir, setCurrentDir] = useState('')
  const [newDir, setNewDir] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState<SaveDirProgress | null>(null)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const loadLibrary = useLibraryStore((s) => s.loadLibrary)

  useEffect(() => {
    window.api.getSaveDir().then(setCurrentDir)
    const off = window.api.onSaveDirProgress(setProgress)
    return off
  }, [])

  const browse = async () => {
    setBrowsing(true)
    try {
      const p = await window.api.pickSaveDir()
      if (p) setNewDir(p)
    } finally {
      setBrowsing(false)
    }
  }

  const save = async () => {
    if (!newDir.trim()) {
      window.alert('请先选择新的 savepicture 文件夹位置。')
      return
    }
    const v = await window.api.validateSaveDir(newDir.trim())
    if (!v.ok) {
      window.alert(`无法使用该路径：${v.reason ?? '未知原因'}`)
      return
    }
    setConfirmOpen(true)
  }

  const confirmMigrate = async () => {
    setConfirmOpen(false)
    setMigrating(true)
    setProgress({ current: 0, total: 0, bytes: 0, totalBytes: 0, name: '' })
    try {
      const res = await window.api.migrateSaveDir(newDir.trim())
      if (res.errors.length === 0) {
        setCurrentDir(newDir.trim())
        setNewDir('')
        setResult({ ok: true, text: `迁移成功，共迁移 ${res.moved} 个文件。` })
        // 路径已更新，刷新照片库数据
        loadLibrary()
      } else {
        setResult({
          ok: false,
          text: `迁移失败（${res.errors.length} 个文件出错，已迁移 ${res.moved} 个）。原文件夹未删除，数据安全。\n\n${res.errors.slice(0, 8).join('\n')}${res.errors.length > 8 ? `\n… 等共 ${res.errors.length} 个错误` : ''}`
        })
      }
    } finally {
      setMigrating(false)
      setProgress(null)
    }
  }

  const errorSuggestion =
    result && !result.ok
      ? '建议操作：\n1) 若提示文件被占用/权限不足，请关闭占用该文件的程序或更换到有写入权限的目录后重试；\n2) 若提示磁盘空间不足，请清理目标盘空间或更换磁盘；\n3) 已复制的文件会自动跳过，直接重试即可续传，无需从头开始。'
      : ''

  // 进度百分比：优先按字节计算，无字节信息时退化为文件数
  const pct = progress
    ? progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.bytes / progress.totalBytes) * 100))
      : progress.total > 0
        ? Math.min(100, Math.round((progress.current / progress.total) * 100))
        : 0
    : 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b border-neutral-200 bg-white px-5 py-3">
        <h1 className="text-lg font-semibold">设置</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <section className="max-w-2xl rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-base font-medium text-neutral-800">savepicture 文件夹位置</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-neutral-600">当前文件夹路径</label>
              <input
                readOnly
                value={currentDir}
                className="w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-neutral-600">新文件夹路径</label>
              <div className="flex items-center gap-2">
                <input
                  value={newDir}
                  onChange={(e) => setNewDir(e.target.value)}
                  placeholder="可手动输入，或点击右侧按钮浏览选择"
                  className="min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={browse}
                  disabled={browsing || migrating}
                  className="shrink-0 rounded border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                >
                  {browsing ? '浏览中…' : '浏览文件夹'}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={save}
                disabled={migrating || !newDir.trim()}
                className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                保存设置
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              更改路径后，原 savepicture 文件夹中的全部照片将复制到新位置，并在校验成功后删除原文件夹。
            </p>
          </div>
        </section>
      </div>

      {/* 确认对话框 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setConfirmOpen(false)}>
          <div
            className="w-[420px] rounded-lg bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-semibold text-neutral-800">确认更改文件夹位置？</h3>
            <p className="mb-4 text-sm text-neutral-600">
              此操作将把原 savepicture 文件夹中的所有文件迁移到以下新位置，校验成功后会删除原文件夹：
            </p>
            <div className="mb-4 break-all rounded bg-neutral-50 px-3 py-2 text-xs text-neutral-500">{newDir}</div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={confirmMigrate}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                确认迁移
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 迁移进度 */}
      {migrating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-3 text-base font-semibold text-neutral-800">正在迁移文件…</h3>
            <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
              <span className="font-medium">{pct}%</span>
              <span>{progress ? `${progress.current} / ${progress.total} 个文件` : '准备中…'}</span>
            </div>
            {progress && progress.totalBytes > 0 && (
              <div className="mb-2 text-right text-xs text-neutral-400">
                已传输 {fmtBytes(progress.bytes)} / {fmtBytes(progress.totalBytes)}
              </div>
            )}
            <div className="truncate text-xs text-neutral-400">{progress?.name ?? ''}</div>
          </div>
        </div>
      )}

      {/* 结果提示 */}
      {result && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setResult(null)}>
          <div
            className="w-[460px] rounded-lg bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`mb-2 text-base font-semibold ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
              {result.ok ? '迁移成功' : '迁移失败'}
            </h3>
            <pre className="mb-4 max-h-60 overflow-y-auto whitespace-pre-wrap break-all rounded bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {result.text}
              {errorSuggestion ? `\n\n${errorSuggestion}` : ''}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setResult(null)}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}