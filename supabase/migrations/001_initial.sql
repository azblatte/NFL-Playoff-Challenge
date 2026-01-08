-- NFL Playoff Challenge Database Schema
-- Phase 2: Initial migration with 6 tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- TABLE 1: profiles (user display names)
-- ===========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ===========================================
-- TABLE 2: leagues (multi-league support)
-- ===========================================
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  scoring_format TEXT DEFAULT 'PPR' CHECK (scoring_format IN ('PPR', 'HALF_PPR', 'STANDARD')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for leagues
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leagues"
  ON leagues FOR SELECT
  TO authenticated
  USING (true);

-- Insert default league for MVP
INSERT INTO leagues (id, name, scoring_format)
VALUES ('00000000-0000-0000-0000-000000000001', '2026 NFL Playoff Challenge', 'PPR');

-- ===========================================
-- TABLE 3: player_pool (all playoff players)
-- ===========================================
CREATE TABLE player_pool (
  player_key TEXT PRIMARY KEY,
  espn_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  team TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('QB', 'RB', 'WR', 'TE', 'K', 'DST')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_player_pool_espn_id ON player_pool(espn_id);
CREATE INDEX idx_player_pool_team ON player_pool(team);
CREATE INDEX idx_player_pool_position ON player_pool(position);

-- RLS Policies for player_pool
ALTER TABLE player_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player pool"
  ON player_pool FOR SELECT
  TO authenticated
  USING (true);

-- ===========================================
-- TABLE 4: playoff_schedule (game times & locks)
-- ===========================================
CREATE TABLE playoff_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  espn_game_id TEXT NOT NULL UNIQUE,
  round TEXT NOT NULL CHECK (round IN ('WC', 'DIV', 'CONF', 'SB')),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'final')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_playoff_schedule_round ON playoff_schedule(round);
CREATE INDEX idx_playoff_schedule_status ON playoff_schedule(status);
CREATE INDEX idx_playoff_schedule_kickoff ON playoff_schedule(kickoff_time);

-- RLS Policies for playoff_schedule
ALTER TABLE playoff_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schedule"
  ON playoff_schedule FOR SELECT
  TO authenticated
  USING (true);

-- ===========================================
-- TABLE 5: rosters (user rosters per round)
-- ===========================================
CREATE TABLE rosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  round TEXT NOT NULL CHECK (round IN ('WC', 'DIV', 'CONF', 'SB')),

  -- Roster slots with player_keys and multipliers
  qb_player_key TEXT REFERENCES player_pool(player_key),
  qb_weeks_held INT DEFAULT 1,

  rb1_player_key TEXT REFERENCES player_pool(player_key),
  rb1_weeks_held INT DEFAULT 1,

  rb2_player_key TEXT REFERENCES player_pool(player_key),
  rb2_weeks_held INT DEFAULT 1,

  wr1_player_key TEXT REFERENCES player_pool(player_key),
  wr1_weeks_held INT DEFAULT 1,

  wr2_player_key TEXT REFERENCES player_pool(player_key),
  wr2_weeks_held INT DEFAULT 1,

  te_player_key TEXT REFERENCES player_pool(player_key),
  te_weeks_held INT DEFAULT 1,

  k_player_key TEXT REFERENCES player_pool(player_key),
  k_weeks_held INT DEFAULT 1,

  dst_player_key TEXT REFERENCES player_pool(player_key),
  dst_weeks_held INT DEFAULT 1,

  submitted_at TIMESTAMP WITH TIME ZONE,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one roster per user per round per league
  UNIQUE(user_id, league_id, round)
);

-- Indexes for faster queries
CREATE INDEX idx_rosters_user_id ON rosters(user_id);
CREATE INDEX idx_rosters_league_id ON rosters(league_id);
CREATE INDEX idx_rosters_round ON rosters(round);

-- RLS Policies for rosters
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all rosters in their league"
  ON rosters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own rosters"
  ON rosters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rosters"
  ON rosters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===========================================
-- TABLE 6: player_scores (ESPN API synced scores)
-- ===========================================
CREATE TABLE player_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_key TEXT NOT NULL REFERENCES player_pool(player_key) ON DELETE CASCADE,
  espn_game_id TEXT,
  round TEXT NOT NULL CHECK (round IN ('WC', 'DIV', 'CONF', 'SB')),
  points DECIMAL(10,2) DEFAULT 0,
  stats JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one score per player per round (for upserts)
  UNIQUE(player_key, round)
);

-- Indexes for faster queries
CREATE INDEX idx_player_scores_round ON player_scores(round);
CREATE INDEX idx_player_scores_espn_game ON player_scores(espn_game_id);
CREATE INDEX idx_player_scores_stats ON player_scores USING GIN (stats);

-- RLS Policies for player_scores
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player scores"
  ON player_scores FOR SELECT
  TO authenticated
  USING (true);

-- ===========================================
-- TRIGGER: Auto-create profile on user signup
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles table when a new user signs up
  -- Display name will be set by the application during signup
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', 'User' || substring(new.id::text from 1 for 8))
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function to check if a player's game has started (for locks)
CREATE OR REPLACE FUNCTION is_player_locked(
  p_player_key TEXT,
  p_round TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  player_team TEXT;
  game_kickoff TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get player's team
  SELECT team INTO player_team
  FROM player_pool
  WHERE player_key = p_player_key;

  -- Get kickoff time for player's game
  SELECT kickoff_time INTO game_kickoff
  FROM playoff_schedule
  WHERE round = p_round
    AND (home_team = player_team OR away_team = player_team)
  LIMIT 1;

  -- Return true if game has started
  RETURN game_kickoff IS NOT NULL AND game_kickoff <= NOW();
END;
$$;

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================
COMMENT ON TABLE profiles IS 'User profiles with display names';
COMMENT ON TABLE leagues IS 'Leagues for multi-league support (MVP uses one default league)';
COMMENT ON TABLE player_pool IS 'All playoff players with ESPN IDs for API matching';
COMMENT ON TABLE playoff_schedule IS 'Playoff games schedule for player locks';
COMMENT ON TABLE rosters IS 'User rosters per round with multipliers (weeks_held)';
COMMENT ON TABLE player_scores IS 'Player fantasy scores synced from ESPN API';

COMMENT ON COLUMN player_pool.espn_id IS 'ESPN athlete ID (e.g., "3918298" for Josh Allen)';
COMMENT ON COLUMN player_pool.player_key IS 'Unique key format: FirstInitial.LastName-TEAM-POS';
COMMENT ON COLUMN rosters.qb_weeks_held IS 'Multiplier counter (1=1x, 2=2x, 3=3x, 4=4x)';
COMMENT ON COLUMN player_scores.stats IS 'Raw ESPN stats JSON for debugging';
