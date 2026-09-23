import { useEffect, useState } from 'react'
import { useLibraryStore } from './store/library'
import { useBackgroundStore } from './store/background'
import LibraryPage from './pages/LibraryPage'
import CanvasPage from './pages/CanvasPage'
import { EditorPage } from './pages/EditorPage'
import SettingsPage from './pages/SettingsPage'
import MindLibraryPage from './pages/MindLibraryPage'

type Tab = 'library' | 'canvas' | 'mindlib' | 'settings'

const SIDEBAR_KEY = 'photomind.sidebar.expanded'

function PhotoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-9 9" />
    </svg>
  )
}

function CanvasIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="5" cy="5" r="1.9" />
      <circle cx="19" cy="5" r="1.9" />
      <circle cx="5" cy="19" r="1.9" />
      <circle cx="19" cy="19" r="1.9" />
      <path d="M12 12 6.1 6.1M12 12l5.8-5.8M12 12l-5.9 5.9M12 12l5.9 5.9" />
    </svg>
  )
}

function MindLibIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  expanded
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  expanded: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        expanded ? 'justify-start' : 'justify-center'
      } ${active ? 'bg-blue-50 font-medium text-blue-600' : 'text-content-muted hover:bg-surface-hover hover:text-content'}`}
    >
      <span className="shrink-0">{icon}</span>
      {expanded && <span className="whitespace-nowrap">{label}</span>}
    </button>
  )
}

export default function App() {
  const editor = useLibraryStore((s) => s.editor)
  const hasBg = useBackgroundStore((s) => s.hasImage)
  const bgOpacity = useBackgroundStore((s) => s.opacity)
  const bgRev = useBackgroundStore((s) => s.rev)
  const loadBackground = useBackgroundStore((s) => s.load)
  const [tab, setTab] = useState<Tab>('library')
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setExpanded((v) => {
      const next = !v
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  useEffect(() => {
    loadBackground()
  }, [loadBackground])

  return (
    <div className="relative flex h-full bg-canvas text-content">
      {hasBg && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url('photomind://bg?t=${bgRev}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: bgOpacity
          }}
        />
      )}
      {/* 左侧导航栏 */}
      <aside
        className={`relative z-10 flex shrink-0 flex-col border-r border-outline glass transition-[width] duration-300 ${
          expanded ? 'w-44' : 'w-14'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-center gap-2 border-b border-outline px-2">
          <button
            onClick={toggleSidebar}
            title={expanded ? '收起侧边栏' : '展开侧边栏'}
            className="flex shrink-0 items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-600">
              <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" />
              <circle cx="12" cy="12" r="3.4" fill="white" />
            </svg>
          </button>
          {expanded && <h1 className="whitespace-nowrap text-lg font-semibold">PhotoMind</h1>}
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2">
          <NavButton active={tab === 'library'} onClick={() => setTab('library')} icon={<PhotoIcon />} label="照片库" expanded={expanded} />
          <NavButton active={tab === 'canvas'} onClick={() => setTab('canvas')} icon={<CanvasIcon />} label="联想画布" expanded={expanded} />
          <NavButton active={tab === 'mindlib'} onClick={() => setTab('mindlib')} icon={<MindLibIcon />} label="联想库" expanded={expanded} />
          <NavButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={<SettingsIcon />} label="设置" expanded={expanded} />
        </nav>
      </aside>

      <main className="relative z-10 min-h-0 flex-1">
        {tab === 'library' ? (
          <LibraryPage />
        ) : tab === 'canvas' ? (
          <CanvasPage />
        ) : tab === 'mindlib' ? (
          <MindLibraryPage />
        ) : (
          <SettingsPage />
        )}
      </main>

      {editor && <EditorPage />}
    </div>
  )
}