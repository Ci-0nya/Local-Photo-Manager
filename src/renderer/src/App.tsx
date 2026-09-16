import { useState } from 'react'
import LibraryPage from './pages/LibraryPage'
import CanvasPage from './pages/CanvasPage'

type Tab = 'library' | 'canvas'

export default function App() {
  const [tab, setTab] = useState<Tab>('library')

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1 text-sm transition-colors ${
      active ? 'bg-blue-50 font-medium text-blue-600' : 'text-neutral-500 hover:text-neutral-800'
    }`

  return (
    <div className="flex h-full flex-col bg-neutral-50 text-neutral-900">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5">
        <div className="flex items-center gap-5">
          <h1 className="text-lg font-semibold">PhotoMind</h1>
          <nav className="flex items-center gap-1">
            <button onClick={() => setTab('library')} className={tabClass(tab === 'library')}>
              照片库
            </button>
            <button onClick={() => setTab('canvas')} className={tabClass(tab === 'canvas')}>
              联想画布
            </button>
          </nav>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        {tab === 'library' ? <LibraryPage /> : <CanvasPage />}
      </main>
    </div>
  )
}