// 2026 NFL Playoff Teams
// Update this list with actual 2026 playoff teams once determined

export interface PlayoffTeam {
  abbrev: string;
  fullName: string;
  seed: number;
  conference: 'AFC' | 'NFC';
}

// PLACEHOLDER: Update with actual 2026 playoff teams
// These are example teams - replace with real teams after Wild Card matchups are set
export const PLAYOFF_TEAMS_2026: PlayoffTeam[] = [
  // AFC
  { abbrev: 'BUF', fullName: 'Buffalo Bills', seed: 1, conference: 'AFC' },
  { abbrev: 'KC', fullName: 'Kansas City Chiefs', seed: 2, conference: 'AFC' },
  { abbrev: 'BAL', fullName: 'Baltimore Ravens', seed: 3, conference: 'AFC' },
  { abbrev: 'HOU', fullName: 'Houston Texans', seed: 4, conference: 'AFC' },
  { abbrev: 'PIT', fullName: 'Pittsburgh Steelers', seed: 5, conference: 'AFC' },
  { abbrev: 'LAC', fullName: 'Los Angeles Chargers', seed: 6, conference: 'AFC' },
  { abbrev: 'DEN', fullName: 'Denver Broncos', seed: 7, conference: 'AFC' },

  // NFC
  { abbrev: 'DET', fullName: 'Detroit Lions', seed: 1, conference: 'NFC' },
  { abbrev: 'PHI', fullName: 'Philadelphia Eagles', seed: 2, conference: 'NFC' },
  { abbrev: 'TB', fullName: 'Tampa Bay Buccaneers', seed: 3, conference: 'NFC' },
  { abbrev: 'LAR', fullName: 'Los Angeles Rams', seed: 4, conference: 'NFC' },
  { abbrev: 'MIN', fullName: 'Minnesota Vikings', seed: 5, conference: 'NFC' },
  { abbrev: 'WAS', fullName: 'Washington Commanders', seed: 6, conference: 'NFC' },
  { abbrev: 'GB', fullName: 'Green Bay Packers', seed: 7, conference: 'NFC' },
];

// Wild Card Matchups (Seeds 2-7 play, Seeds 1 get bye)
export const WILD_CARD_MATCHUPS_2026 = [
  // AFC
  { home: 'HOU', away: 'LAC', round: 'WC' },  // 4 vs 5
  { home: 'BAL', away: 'PIT', round: 'WC' },  // 3 vs 6
  { home: 'KC', away: 'DEN', round: 'WC' },   // 2 vs 7

  // NFC
  { home: 'TB', away: 'WAS', round: 'WC' },   // 4 vs 5
  { home: 'LAR', away: 'MIN', round: 'WC' },  // 3 vs 6
  { home: 'PHI', away: 'GB', round: 'WC' },   // 2 vs 7
];

// ESPN Team Name Mapping (ESPN uses different abbreviations sometimes)
export const ESPN_TEAM_MAP: Record<string, string> = {
  'BUF': 'BUF',
  'KC': 'KC',
  'BAL': 'BAL',
  'HOU': 'HOU',
  'PIT': 'PIT',
  'LAC': 'LAC',
  'DEN': 'DEN',
  'DET': 'DET',
  'PHI': 'PHI',
  'TB': 'TB',
  'LAR': 'LAR',
  'MIN': 'MIN',
  'WAS': 'WSH',  // ESPN uses WSH for Washington
  'GB': 'GB',
};

export function getESPNTeamAbbrev(team: string): string {
  return ESPN_TEAM_MAP[team] || team;
}
