import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mtime_ms INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  folder_id INTEGER,
  source_path TEXT,
  edited INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  rating INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT '',
  edited_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at);

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

CREATE TABLE IF NOT EXISTS mind_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  payload TEXT NOT NULL,
  image_name TEXT,
  created_at INTEGER NOT NULL
);
`

// 将旧版「分类」数据（categories + photo_categories 多对多）迁移为新版 tags 标签数组
function migrateCategoriesToTags(db: DatabaseSync): void {
  const has = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('categories', 'photo_categories')")
    .all() as unknown as { name: string }[]
  if (has.length < 2) return // 两张旧表不齐全（新库或半残旧库）则无需迁移

  const rows = db
    .prepare(
      `SELECT pc.photo_id AS photoId, c.name AS name
       FROM photo_categories pc
       JOIN categories c ON c.id = pc.category_id`
    )
    .all() as unknown as { photoId: number; name: string }[]

  const byPhoto = new Map<number, string[]>()
  for (const r of rows) {
    const list = byPhoto.get(r.photoId) ?? []
    if (!list.includes(r.name)) list.push(r.name)
    byPhoto.set(r.photoId, list)
  }

  const getTags = db.prepare('SELECT tags FROM photos WHERE id = ?')
  const setTags = db.prepare('UPDATE photos SET tags = ? WHERE id = ?')
  for (const [photoId, names] of byPhoto) {
    let existing: string[] = []
    const cur = getTags.get(photoId) as { tags: string | null } | undefined
    if (cur?.tags) {
      try {
        const parsed = JSON.parse(cur.tags)
        if (Array.isArray(parsed)) existing = parsed.map(String)
      } catch {
        /* 忽略非法 JSON */
      }
    }
    const merged = [...new Set([...existing, ...names])]
    setTags.run(JSON.stringify(merged), photoId)
  }
}

export function createDatabase(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)

  // 迁移：旧库 photos 表补 edited / tags 等列（须先于分类迁移，tags 列将被用于承载旧分类）
  const cols = db.prepare('PRAGMA table_info(photos)').all() as unknown as { name: string }[]
  if (!cols.some((c) => c.name === 'edited')) db.exec('ALTER TABLE photos ADD COLUMN edited INTEGER NOT NULL DEFAULT 0')
  if (!cols.some((c) => c.name === 'source_path')) db.exec('ALTER TABLE photos ADD COLUMN source_path TEXT')
  if (!cols.some((c) => c.name === 'tags')) db.exec("ALTER TABLE photos ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'")
  if (!cols.some((c) => c.name === 'rating')) db.exec('ALTER TABLE photos ADD COLUMN rating INTEGER NOT NULL DEFAULT 0')
  if (!cols.some((c) => c.name === 'name')) db.exec("ALTER TABLE photos ADD COLUMN name TEXT NOT NULL DEFAULT ''")
  if (!cols.some((c) => c.name === 'edited_at')) {
    db.exec('ALTER TABLE photos ADD COLUMN edited_at INTEGER')
    // 回填历史已编辑照片：用 id（≈导入顺序）作为编辑顺序，保证确定且不丢序
    db.exec('UPDATE photos SET edited_at = id WHERE edited = 1 AND edited_at IS NULL')
  }

  // 迁移：旧「分类」数据 → 标签（必须在删除旧表之前执行，避免数据丢失）
  migrateCategoriesToTags(db)

  // 删除已废弃的「分类」表
  db.exec('DROP TABLE IF EXISTS photo_categories')
  db.exec('DROP TABLE IF EXISTS categories')

  // 迁移：联想库条目补 image_name 列
  const libCols = db.prepare('PRAGMA table_info(mind_library)').all() as unknown as { name: string }[]
  if (!libCols.some((c) => c.name === 'image_name')) db.exec('ALTER TABLE mind_library ADD COLUMN image_name TEXT')

  return db
}