// App settings utilities - reads from database instead of hardcoded constants

import { supabase } from './supabase';

export type Round = 'WC' | 'DIV' | 'CONF' | 'SB';

export const ROUNDS: Round[] = ['WC', 'DIV', 'CONF', 'SB'];

export const ROUND_NAMES: Record<Round, string> = {
  WC: 'Wild Card',
  DIV: 'Divisional',
  CONF: 'Conference',
  SB: 'Super Bowl',
};

// Cache for current round to avoid repeated DB calls
let cachedRound: Round | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function getCurrentRound(): Promise<Round> {
  // Return cached value if still valid
  if (cachedRound && Date.now() < cacheExpiry) {
    return cachedRound;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'current_round')
    .single();

  if (error || !data) {
    console.error('Failed to get current round, defaulting to WC:', error);
    return 'WC';
  }

  // Value is stored as JSON string like '"WC"'
  const round = (typeof data.value === 'string' ? data.value : JSON.stringify(data.value)).replace(/"/g, '') as Round;

  // Update cache
  cachedRound = round;
  cacheExpiry = Date.now() + CACHE_TTL;

  return round;
}

export function clearRoundCache() {
  cachedRound = null;
  cacheExpiry = 0;
}

export function getNextRound(current: Round): Round | null {
  const index = ROUNDS.indexOf(current);
  if (index === -1 || index >= ROUNDS.length - 1) return null;
  return ROUNDS[index + 1];
}

export function getPreviousRound(current: Round): Round | null {
  const index = ROUNDS.indexOf(current);
  if (index <= 0) return null;
  return ROUNDS[index - 1];
}
