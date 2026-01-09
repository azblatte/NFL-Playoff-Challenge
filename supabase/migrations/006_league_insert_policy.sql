-- Allow authenticated users to create leagues (owner_user_id must match)

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create leagues" ON leagues;
CREATE POLICY "Users can create leagues"
  ON leagues FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
