// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface League {
  id: string;
  name: string;
  scoring_format: 'PPR' | 'HALF_PPR' | 'STANDARD';
  join_code: string | null;
  owner_user_id: string | null;
  scoring_settings: Record<string, unknown> | null;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface PlayerPool {
  player_key: string;
  espn_id: string;
  full_name: string;
  team: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
  is_active: boolean;
  created_at: string;
}

export interface PlayoffSchedule {
  id: string;
  espn_game_id: string;
  round: 'WC' | 'DIV' | 'CONF' | 'SB';
  home_team: string;
  away_team: string;
  kickoff_time: string;
  status: 'scheduled' | 'in_progress' | 'final';
  created_at: string;
}

export interface Roster {
  id: string;
  user_id: string;
  league_id: string;
  round: 'WC' | 'DIV' | 'CONF' | 'SB';
  qb_player_key: string | null;
  qb_weeks_held: number;
  rb1_player_key: string | null;
  rb1_weeks_held: number;
  rb2_player_key: string | null;
  rb2_weeks_held: number;
  wr1_player_key: string | null;
  wr1_weeks_held: number;
  wr2_player_key: string | null;
  wr2_weeks_held: number;
  te_player_key: string | null;
  te_weeks_held: number;
  k_player_key: string | null;
  k_weeks_held: number;
  dst_player_key: string | null;
  dst_weeks_held: number;
  submitted_at: string | null;
  is_final: boolean;
  created_at: string;
}

export interface PlayerScore {
  id: string;
  player_key: string;
  espn_game_id: string | null;
  round: 'WC' | 'DIV' | 'CONF' | 'SB';
  points: number;
  stats: Record<string, unknown> | null;
  last_synced_at: string;
  created_at: string;
}

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper to get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
}
