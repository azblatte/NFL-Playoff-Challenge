-- App-wide settings table for dynamic round management
-- This replaces hardcoded CURRENT_ROUND constants

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only allow updates via service role (admin API)
CREATE POLICY "Service role can update settings"
  ON app_settings FOR ALL
  TO service_role
  USING (true);

-- Insert initial settings
INSERT INTO app_settings (key, value) VALUES
  ('current_round', '"WC"'),
  ('round_locked', 'false'),
  ('auto_advance_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Also allow anon to read for public pages
CREATE POLICY "Anon can view app settings"
  ON app_settings FOR SELECT
  TO anon
  USING (true);
