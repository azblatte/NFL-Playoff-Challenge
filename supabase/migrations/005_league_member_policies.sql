-- League member policies for join/leave/self access

ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
  ON league_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join leagues"
  ON league_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues"
  ON league_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
