import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  folder_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at);

CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort);

CREATE TABLE IF NOT EXISTS photo_categories (
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_categories_category ON photo_categories(category_id);

CREATE TABLE IF NOT EXISTS maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS map_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  map_id INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  title TEXT
);

CREATE INDEX IF NOT EXISTS idx_map_nodes_map ON map_nodes(map_id);

CREATE TABLE IF NOT EXISTS map_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  map_id INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  source_node_id INTEGER NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  target_node_id INTEGER NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  label TEXT
);

CREATE INDEX IF NOT EXISTS idx_map_edges_map ON map_edges(map_id);
`

export function createDatabase(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)

  // 迁移：旧库的 photos 表可能没有 folder_id 列，自动补上（幂等）
  const cols = db.prepare('PRAGMA table_info(photos)').all() as unknown as { name: string }[]
  if (!cols.some((c) => c.name === 'folder_id')) {
    db.exec('ALTER TABLE photos ADD COLUMN folder_id INTEGER')
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_photos_folder ON photos(folder_id)')

  return db
}