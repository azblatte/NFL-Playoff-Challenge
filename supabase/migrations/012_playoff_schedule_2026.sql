-- 2026 NFL Playoff Schedule Seed Data
-- Wild Card Weekend: January 10-12, 2026
-- Divisional Round: January 17-18, 2026
-- Conference Championships: January 25, 2026
-- Super Bowl LX: February 8, 2026

-- Clear existing schedule data (if re-running)
DELETE FROM playoff_schedule WHERE round IN ('WC', 'DIV', 'CONF', 'SB');

-- =====================
-- WILD CARD WEEKEND
-- =====================

-- Saturday January 10, 2026
INSERT INTO playoff_schedule (espn_game_id, round, home_team, away_team, kickoff_time, status) VALUES
('401672001', 'WC', 'CAR', 'LAR', '2026-01-10T21:30:00Z', 'scheduled'),  -- 4:30 PM ET
('401672002', 'WC', 'CHI', 'GB', '2026-01-11T01:00:00Z', 'scheduled');   -- 8:00 PM ET

-- Sunday January 11, 2026
INSERT INTO playoff_schedule (espn_game_id, round, home_team, away_team, kickoff_time, status) VALUES
('401672003', 'WC', 'JAX', 'BUF', '2026-01-11T18:00:00Z', 'scheduled'),  -- 1:00 PM ET
('401672004', 'WC', 'PHI', 'SF', '2026-01-11T21:30:00Z', 'scheduled'),   -- 4:30 PM ET
('401672005', 'WC', 'NE', 'LAC', '2026-01-12T01:00:00Z', 'scheduled');   -- 8:00 PM ET

-- Monday January 12, 2026
INSERT INTO playoff_schedule (espn_game_id, round, home_team, away_team, kickoff_time, status) VALUES
('401672006', 'WC', 'PIT', 'HOU', '2026-01-13T01:15:00Z', 'scheduled');  -- 8:15 PM ET

-- =====================
-- DIVISIONAL ROUND
-- Bye teams: DEN (AFC 1), SEA (NFC 1)
-- =====================

-- Saturday January 17, 2026 (placeholder - teams TBD after WC)
INSERT INTO playoff_schedule (espn_game_id, round, home_team, away_team, kickoff_time, status) VALUES
('401672010', 'DIV', 'DEN', 'TBD', '2026-01-17T21:30:00Z', 'scheduled'),  -- AFC: DEN vs lowest remaining seed
('401672011', 'DIV', 'SEA', 'TBD', '2026-01-18T01:00:00Z', 'scheduled');  -- NFC: SEA vs lowest remaining seed

-- Sunday January 18, 2026 (placeholder - teams TBD after WC)
INSERT INTO playoff_schedule (espn_game_id, round, home_team, away_team, kickoff_time, status) VALUES
('401672012', 'DIV', 'TBD', 'TBD', '2026-01-18T18:00:00Z', 'scheduled'),  -- Higher seed vs lower seed
('401672013', 'DIV', 'TBD', 'TBD', '2026-01-18T21:30:00Z', 'scheduled');  -- Higher seed vs lower seed

-- =====================
-- CONFERENCE CHAMPIONSHIPS
-- =====================

-- Sunday January 25, 2026 (placeholder - teams TBD after DIV)
INSERT INTO playoff_schedule (espn_game_id, round, home_team, away_team, kickoff_time, status) VALUES
('401672020', 'CONF', 'TBD', 'TBD', '2026-01-25T18:00:00Z', 'scheduled'),  -- AFC Championship
('401672021', 'CONF', 'TBD', 'TBD', '2026-01-25T21:30:00Z', 'scheduled');  -- NFC Championship

-- =====================
-- SUPER BOWL LX
-- =====================

-- Sunday February 8, 2026 (placeholder)
INSERT INTO playoff_schedule (espn_game_id, round, home_team, away_team, kickoff_time, status) VALUES
('401672030', 'SB', 'TBD', 'TBD', '2026-02-08T23:30:00Z', 'scheduled');  -- Super Bowl LX - 6:30 PM ET

-- Note: After Wild Card games are final, the auto-advance cron will need the
-- DIV round schedule updated with actual teams. You can update via Supabase dashboard:
--
-- UPDATE playoff_schedule
-- SET home_team = 'WINNER_TEAM', away_team = 'LOSER_TEAM'
-- WHERE espn_game_id = '401672010';
