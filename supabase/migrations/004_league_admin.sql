-- League admin policies (includes prerequisites if 003 was skipped)

-- Ensure league columns exist
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id);

-- Backfill default league join code if missing
UPDATE leagues
SET join_code = COALESCE(join_code, 'DEFAULT')
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Ensure league_members exists
CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

-- Allow owners/admins to update league settings
CREATE POLICY "Owners or admins can update leagues"
  ON leagues FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = leagues.id
        AND league_members.user_id = auth.uid()
        AND league_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = leagues.id
        AND league_members.user_id = auth.uid()
        AND league_members.role IN ('owner', 'admin')
    )
  );

-- Allow admins to view members
CREATE POLICY "League admins can view members"
  ON league_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_members AS lm
      WHERE lm.league_id = league_members.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin')
    )
  );

-- Allow owners to update member roles
CREATE POLICY "League owners can update members"
  ON league_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (
      SELECT owner_user_id FROM leagues WHERE leagues.id = league_members.league_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT owner_user_id FROM leagues WHERE leagues.id = league_members.league_id
    )
  );

-- Allow owners to remove members
CREATE POLICY "League owners can delete members"
  ON league_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = (
      SELECT owner_user_id FROM leagues WHERE leagues.id = league_members.league_id
    )
  );
