-- Add team_name column to league_members for fantasy team names
-- e.g., "The Underdogs", "Gridiron Gang"

ALTER TABLE league_members ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Update existing members to use their display name as default team name
UPDATE league_members lm
SET team_name = COALESCE(
  (SELECT display_name FROM profiles WHERE id = lm.user_id),
  'Team ' || substring(lm.user_id::text from 1 for 8)
)
WHERE team_name IS NULL;
