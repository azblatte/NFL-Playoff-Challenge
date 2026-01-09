-- Fix recursive league_members policy by using a security definer helper

DROP POLICY IF EXISTS "League admins can view members" ON league_members;

CREATE OR REPLACE FUNCTION public.is_league_admin(p_league_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_league_admin(uuid) TO authenticated;

CREATE POLICY "League admins can view members"
  ON league_members FOR SELECT
  TO authenticated
  USING (public.is_league_admin(league_id));
