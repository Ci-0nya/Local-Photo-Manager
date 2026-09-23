import { create } from 'zustand'

export type SearchMode = 'or' | 'and'
export type SortKey = 'editedAt' | 'rating' | 'fileSize'
export type SortDir = 'asc' | 'desc'

// 照片库 UI 状态（搜索/临时相册/筛选/排序），存入全局 store 以在切换页面后保留
interface LibraryUiState {
  searchInput: string
  activeTags: string[]
  searchMode: SearchMode
  filterRatings: Set<number>
  sortKey: SortKey
  sortDir: SortDir
  setSearchInput: (v: string) => void
  setActiveTags: (tags: string[]) => void
  setSearchMode: (m: SearchMode) => void
  setFilterRatings: (ratings: Set<number>) => void
  setSortKey: (k: SortKey) => void
  setSortDir: (d: SortDir) => void
}

export const useLibraryUi = create<LibraryUiState>((set) => ({
  searchInput: '',
  activeTags: [],
  searchMode: 'or',
  filterRatings: new Set(),
  sortKey: 'editedAt',
  sortDir: 'asc',
  setSearchInput: (v) => set({ searchInput: v }),
  setActiveTags: (tags) => set({ activeTags: tags }),
  setSearchMode: (m) => set({ searchMode: m }),
  setFilterRatings: (ratings) => set({ filterRatings: ratings }),
  setSortKey: (k) => set({ sortKey: k }),
  setSortDir: (d) => set({ sortDir: d })
}))