// Player lock logic based on game kickoff times
import { supabase, PlayoffSchedule } from './supabase';

export interface LockStatus {
  isLocked: boolean;
  kickoffTime: Date | null;
  timeUntilLock: number | null; // milliseconds
}

// Check if a specific player is locked
export async function isPlayerLocked(
  playerKey: string,
  round: 'WC' | 'DIV' | 'CONF' | 'SB'
): Promise<LockStatus> {
  // Get player's team
  const { data: player } = await supabase
    .from('player_pool')
    .select('team')
    .eq('player_key', playerKey)
    .single();

  if (!player) {
    return { isLocked: false, kickoffTime: null, timeUntilLock: null };
  }

  // Find the game for this team in this round
  const { data: game } = await supabase
    .from('playoff_schedule')
    .select('kickoff_time')
    .eq('round', round)
    .or(`home_team.eq.${player.team},away_team.eq.${player.team}`)
    .single();

  if (!game) {
    return { isLocked: false, kickoffTime: null, timeUntilLock: null };
  }

  const kickoffTime = new Date(game.kickoff_time);
  const now = new Date();
  const isLocked = now >= kickoffTime;
  const timeUntilLock = isLocked ? 0 : kickoffTime.getTime() - now.getTime();

  return {
    isLocked,
    kickoffTime,
    timeUntilLock
  };
}

// Get lock status for all players in a roster
export async function getRosterLockStatus(
  roster: {
    qb_player_key: string | null;
    rb1_player_key: string | null;
    rb2_player_key: string | null;
    wr1_player_key: string | null;
    wr2_player_key: string | null;
    te_player_key: string | null;
    k_player_key: string | null;
    dst_player_key: string | null;
  },
  round: 'WC' | 'DIV' | 'CONF' | 'SB'
): Promise<Map<string, LockStatus>> {
  const lockStatuses = new Map<string, LockStatus>();

  const playerKeys = [
    roster.qb_player_key,
    roster.rb1_player_key,
    roster.rb2_player_key,
    roster.wr1_player_key,
    roster.wr2_player_key,
    roster.te_player_key,
    roster.k_player_key,
    roster.dst_player_key,
  ].filter(Boolean) as string[];

  for (const playerKey of playerKeys) {
    const status = await isPlayerLocked(playerKey, round);
    lockStatuses.set(playerKey, status);
  }

  return lockStatuses;
}

// Check if any players in roster are from eliminated teams
export async function getEliminatedPlayers(
  roster: {
    qb_player_key: string | null;
    rb1_player_key: string | null;
    rb2_player_key: string | null;
    wr1_player_key: string | null;
    wr2_player_key: string | null;
    te_player_key: string | null;
    k_player_key: string | null;
    dst_player_key: string | null;
  },
  currentRound: 'WC' | 'DIV' | 'CONF' | 'SB'
): Promise<string[]> {
  const eliminatedPlayers: string[] = [];

  const playerKeys = [
    roster.qb_player_key,
    roster.rb1_player_key,
    roster.rb2_player_key,
    roster.wr1_player_key,
    roster.wr2_player_key,
    roster.te_player_key,
    roster.k_player_key,
    roster.dst_player_key,
  ].filter(Boolean) as string[];

  if (playerKeys.length === 0) return eliminatedPlayers;

  // Get all players' teams
  const { data: players } = await supabase
    .from('player_pool')
    .select('player_key, team')
    .in('player_key', playerKeys);

  if (!players) return eliminatedPlayers;

  // Get all teams still in playoffs (have games in current or future rounds)
  const { data: activeGames } = await supabase
    .from('playoff_schedule')
    .select('home_team, away_team, round')
    .gte('round', currentRound);

  if (!activeGames) return eliminatedPlayers;

  const activeTeams = new Set<string>();
  activeGames.forEach(game => {
    activeTeams.add(game.home_team);
    activeTeams.add(game.away_team);
  });

  // Find players whose teams are not active
  players.forEach(player => {
    if (!activeTeams.has(player.team)) {
      eliminatedPlayers.push(player.player_key);
    }
  });

  return eliminatedPlayers;
}

// Get next lock time (earliest game in the round)
export async function getNextLockTime(round: 'WC' | 'DIV' | 'CONF' | 'SB'): Promise<Date | null> {
  const { data: games } = await supabase
    .from('playoff_schedule')
    .select('kickoff_time')
    .eq('round', round)
    .order('kickoff_time', { ascending: true })
    .limit(1);

  if (!games || games.length === 0) return null;

  return new Date(games[0].kickoff_time);
}
