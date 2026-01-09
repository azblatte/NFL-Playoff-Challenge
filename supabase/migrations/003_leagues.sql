-- League join codes, members, and admin ownership

-- Add join code and owner to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id);

-- Backfill default league join code if missing
UPDATE leagues
SET join_code = 'DEFAULT'
WHERE join_code IS NULL;

-- League members table
CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_league_members_user_id ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league_id ON league_members(league_id);

-- RLS for league_members
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
  ON league_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "League owners can view members"
  ON league_members FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (
      SELECT owner_user_id FROM leagues WHERE id = league_id
    )
  );

CREATE POLICY "Users can join leagues"
  ON league_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues"
  ON league_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
