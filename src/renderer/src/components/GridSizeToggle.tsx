const SIZES = [4, 6, 8] as const

export function GridSizeToggle({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-30 flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-lg">
      {SIZES.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-8 w-8 rounded-full text-sm transition-colors ${
            value === n ? 'bg-blue-600 font-medium text-white' : 'text-neutral-500 hover:bg-neutral-100'
          }`}
          aria-label={`每行 ${n} 个`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}