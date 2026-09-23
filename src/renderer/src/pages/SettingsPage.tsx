import { useEffect, useState } from 'react'
import type { SaveDirProgress } from '@shared/ipc'
import { useLibraryStore } from '../store/library'
import { useThemeStore, type ThemeColor } from '../store/theme'
import { useBackgroundStore } from '../store/background'

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const THEME_OPTIONS: Array<{ key: ThemeColor; label: string; swatch: string }> = [
  { key: 'white', label: '白色', swatch: '#ffffff' },
  { key: 'black', label: '黑色', swatch: '#111827' }
]

export default function SettingsPage() {
  const [currentDir, setCurrentDir] = useState('')
  const [newDir, setNewDir] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState<SaveDirProgress | null>(null)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [picking, setPicking] = useState(false)

  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  const hasBg = useBackgroundStore((s) => s.hasImage)
  const bgOpacity = useBackgroundStore((s) => s.opacity)
  const loadBackground = useBackgroundStore((s) => s.load)
  const applyImage = useBackgroundStore((s) => s.applyImage)
  const setBgOpacity = useBackgroundStore((s) => s.setOpacity)
  const clearBg = useBackgroundStore((s) => s.clear)

  const loadLibrary = useLibraryStore((s) => s.loadLibrary)

  useEffect(() => {
    window.api.getSaveDir().then(setCurrentDir)
    const off = window.api.onSaveDirProgress(setProgress)
    return off
  }, [])

  useEffect(() => {
    loadBackground()
  }, [loadBackground])

  const pickAndApply = async () => {
    setPicking(true)
    try {
      const p = await window.api.pickBackground()
      if (p) await applyImage(p)
    } finally {
      setPicking(false)
    }
  }

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

  const pct = progress
    ? progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.bytes / progress.totalBytes) * 100))
      : progress.total > 0
        ? Math.min(100, Math.round((progress.current / progress.total) * 100))
        : 0
    : 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b border-outline glass px-5 py-3">
        <h1 className="text-content text-lg font-semibold">设置</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <section className="mb-6 max-w-2xl rounded-lg border border-outline glass p-5">
          <h2 className="text-content mb-4 text-base font-medium">主题颜色</h2>
          <div className="flex items-center gap-4">
            {THEME_OPTIONS.map((o) => {
              const active = theme === o.key
              return (
                <button
                  key={o.key}
                  onClick={() => setTheme(o.key)}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                    active ? 'border-blue-500 ring-2 ring-blue-500' : 'border-outline hover:border-neutral-400'
                  }`}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-outline"
                    style={{ backgroundColor: o.swatch }}
                  >
                    {active && (
                      <span className={`text-sm font-bold ${o.key === 'white' ? 'text-neutral-800' : 'text-white'}`}>
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="text-content text-sm">{o.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-content-subtle mt-3 text-xs">点击色块即时切换主题，选择会被自动保存，重启后依然生效。</p>
        </section>

        <section className="mb-6 max-w-2xl rounded-lg border border-outline glass p-5">
          <h2 className="text-content mb-4 text-base font-medium">自定义背景</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={pickAndApply}
              disabled={picking}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {picking ? '选择中…' : hasBg ? '更换图片' : '上传图片'}
            </button>
            {hasBg && (
              <button
                onClick={clearBg}
                className="text-content-muted rounded-md border border-outline px-4 py-2 text-sm hover:bg-surface-hover"
              >
                清除背景
              </button>
            )}
          </div>

          <div className="mt-4">
            <label className="text-content-muted mb-1.5 block text-sm">不透明度：{Math.round(bgOpacity * 100)}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(bgOpacity * 100)}
              onChange={(e) => setBgOpacity(Number(e.target.value) / 100)}
              className="w-full accent-blue-600"
            />
          </div>

          <p className="text-content-subtle mt-3 text-xs">上传的图片将作为软件背景显示，可调节不透明度；主题切换不会影响背景图片。</p>
        </section>

        <section className="max-w-2xl rounded-lg border border-outline glass p-5">
          <h2 className="text-content mb-4 text-base font-medium">savepicture 文件夹位置</h2>

          <div className="space-y-4">
            <div>
              <label className="text-content-muted mb-1.5 block text-sm">当前文件夹路径</label>
              <input
                readOnly
                value={currentDir}
                className="text-content-muted w-full rounded border border-outline bg-canvas px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-content-muted mb-1.5 block text-sm">新文件夹路径</label>
              <div className="flex items-center gap-2">
                <input
                  value={newDir}
                  onChange={(e) => setNewDir(e.target.value)}
                  placeholder="可手动输入，或点击右侧按钮浏览选择"
                  className="text-content min-w-0 flex-1 rounded border border-outline px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={browse}
                  disabled={browsing || migrating}
                  className="text-content shrink-0 rounded border border-outline glass px-4 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
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

            <p className="text-content-subtle text-xs">
              更改路径后，原 savepicture 文件夹中的全部照片将复制到新位置，并在校验成功后删除原文件夹。
            </p>
          </div>
        </section>
      </div>

      {/* 确认对话框 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setConfirmOpen(false)}>
          <div
            className="glass w-[420px] rounded-lg p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-content mb-2 text-base font-semibold">确认更改文件夹位置？</h3>
            <p className="text-content-muted mb-4 text-sm">
              此操作将把原 savepicture 文件夹中的所有文件迁移到以下新位置，校验成功后会删除原文件夹：
            </p>
            <div className="text-content-muted bg-canvas mb-4 break-all rounded px-3 py-2 text-xs">{newDir}</div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="text-content rounded border border-outline px-4 py-2 text-sm hover:bg-surface-hover"
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
          <div className="glass w-[420px] rounded-lg p-5 shadow-lg">
            <h3 className="text-content mb-3 text-base font-semibold">正在迁移文件…</h3>
            <div className="bg-surface-hover mb-2 h-2.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-content-muted mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{pct}%</span>
              <span>{progress ? `${progress.current} / ${progress.total} 个文件` : '准备中…'}</span>
            </div>
            {progress && progress.totalBytes > 0 && (
              <div className="text-content-subtle mb-2 text-right text-xs">
                已传输 {fmtBytes(progress.bytes)} / {fmtBytes(progress.totalBytes)}
              </div>
            )}
            <div className="text-content-subtle truncate text-xs">{progress?.name ?? ''}</div>
          </div>
        </div>
      )}

      {/* 结果提示 */}
      {result && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setResult(null)}>
          <div
            className="glass w-[460px] rounded-lg p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`mb-2 text-base font-semibold ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
              {result.ok ? '迁移成功' : '迁移失败'}
            </h3>
            <pre className="text-content-muted bg-canvas mb-4 max-h-60 overflow-y-auto whitespace-pre-wrap break-all rounded px-3 py-2 text-xs">
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