-- Allow league owners to delete their leagues

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League owners can delete leagues" ON leagues;
CREATE POLICY "League owners can delete leagues"
  ON leagues FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_user_id);
