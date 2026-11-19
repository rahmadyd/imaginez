-- 0001_init.sql
CREATE TABLE IF NOT EXISTS templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  canvas_w    INTEGER NOT NULL,
  canvas_h    INTEGER NOT NULL,
  slots_json  TEXT NOT NULL,
  overlay_key TEXT NOT NULL,
  background  TEXT NOT NULL DEFAULT '#ffffff',
  published   INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_templates_pub_sort ON templates (published, sort);

-- backfill for existing DBs (run manually if needed):
-- ALTER TABLE templates ADD COLUMN base_layer_key TEXT;
-- ALTER TABLE templates ADD COLUMN bleed INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE templates ADD COLUMN photo_position TEXT NOT NULL DEFAULT 'behind';
