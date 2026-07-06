-- Jalankan SQL ini di Neon SQL Editor (console.neon.tech)
-- atau via psql client

CREATE TABLE IF NOT EXISTS sections (
  slug VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category VARCHAR(50) NOT NULL DEFAULT 'lainnya',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_category ON sections(category);
CREATE INDEX IF NOT EXISTS idx_sections_sort_order ON sections(sort_order);
