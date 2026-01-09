// 2026 NFL Wild Card Matchups and Projected Points
// Bye teams: DEN (AFC 1), SEA (NFC 1)

export interface Matchup {
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  network: string;
}

export interface TeamMatchup {
  opponent: string;
  isHome: boolean;
  date: string;
  time: string;
  network: string;
  isBye: boolean;
}

// Wild Card Weekend Schedule
export const WILD_CARD_MATCHUPS: Record<string, TeamMatchup> = {
  // AFC
  DEN: { opponent: 'BYE', isHome: true, date: 'Jan 17-18', time: 'TBD', network: '', isBye: true },
  NE: { opponent: 'LAC', isHome: true, date: 'Sun Jan 11', time: '8:00 PM', network: 'NBC', isBye: false },
  JAX: { opponent: 'BUF', isHome: true, date: 'Sun Jan 11', time: '1:00 PM', network: 'CBS', isBye: false },
  PIT: { opponent: 'HOU', isHome: true, date: 'Mon Jan 12', time: '8:15 PM', network: 'ESPN', isBye: false },
  HOU: { opponent: 'PIT', isHome: false, date: 'Mon Jan 12', time: '8:15 PM', network: 'ESPN', isBye: false },
  BUF: { opponent: 'JAX', isHome: false, date: 'Sun Jan 11', time: '1:00 PM', network: 'CBS', isBye: false },
  LAC: { opponent: 'NE', isHome: false, date: 'Sun Jan 11', time: '8:00 PM', network: 'NBC', isBye: false },
  // NFC
  SEA: { opponent: 'BYE', isHome: true, date: 'Jan 17-18', time: 'TBD', network: '', isBye: true },
  CHI: { opponent: 'GB', isHome: true, date: 'Sat Jan 10', time: '8:00 PM', network: 'Prime', isBye: false },
  PHI: { opponent: 'SF', isHome: true, date: 'Sun Jan 11', time: '4:30 PM', network: 'FOX', isBye: false },
  CAR: { opponent: 'LAR', isHome: true, date: 'Sat Jan 10', time: '4:30 PM', network: 'FOX', isBye: false },
  LAR: { opponent: 'CAR', isHome: false, date: 'Sat Jan 10', time: '4:30 PM', network: 'FOX', isBye: false },
  SF: { opponent: 'PHI', isHome: false, date: 'Sun Jan 11', time: '4:30 PM', network: 'FOX', isBye: false },
  GB: { opponent: 'CHI', isHome: false, date: 'Sat Jan 10', time: '8:00 PM', network: 'Prime', isBye: false },
};

// Projected fantasy points for Wild Card round (PPR scoring)
// Based on expert consensus rankings
export const PROJECTED_POINTS: Record<string, number> = {
  // QBs - Starters
  'J.Allen-BUF-QB': 24.5,
  'J.Hurts-PHI-QB': 23.8,
  'J.Herbert-LAC-QB': 21.2,
  'M.Stafford-LAR-QB': 20.5,
  'B.Purdy-SF-QB': 19.8,
  'J.Love-GB-QB': 19.5,
  'C.Williams-CHI-QB': 19.2,
  'C.Stroud-HOU-QB': 18.5,
  'T.Lawrence-JAX-QB': 18.0,
  'D.Maye-NE-QB': 17.5,
  'B.Nix-DEN-QB': 16.0, // BYE - divisional projection
  'S.Darnold-SEA-QB': 15.5, // BYE - divisional projection
  'A.Rodgers-PIT-QB': 17.0,
  'B.Young-CAR-QB': 16.5,

  // RBs - Tier 1
  'S.Barkley-PHI-RB': 22.5,
  'C.McCaffrey-SF-RB': 21.0,
  'J.Jacobs-GB-RB': 18.5,
  'K.Williams-LAR-RB': 18.0,
  'K.Walker-SEA-RB': 16.5, // BYE
  'J.Cook-BUF-RB': 16.0,

  // RBs - Tier 2
  'T.Etienne-JAX-RB': 15.5,
  'D.Swift-CHI-RB': 15.0,
  'R.Stevenson-NE-RB': 14.5,
  'R.Dowdle-CAR-RB': 14.0,
  'C.Hubbard-CAR-RB': 12.5,
  'O.Hampton-LAC-RB': 13.0,
  'R.Harvey-DEN-RB': 12.0, // BYE
  'N.Chubb-HOU-RB': 11.5,

  // RBs - Tier 3
  'J.Warren-PIT-RB': 10.5,
  'K.Gainwell-PIT-RB': 9.0,
  'T.Henderson-NE-RB': 8.5,
  'B.Corum-LAR-RB': 8.0,
  'Z.Charbonnet-SEA-RB': 7.5, // BYE
  'I.Guerendo-SF-RB': 9.5,
  'W.Marks-HOU-RB': 7.0,
  'R.Davis-BUF-RB': 8.0,
  'T.Bigsby-PHI-RB': 6.5,

  // WRs - Tier 1
  'A.Brown-PHI-WR': 19.5,
  'D.Smith-PHI-WR': 16.5,
  'P.Nacua-LAR-WR': 18.0,
  'D.Adams-LAR-WR': 16.0,
  'J.Smith-Njigba-SEA-WR': 14.5, // BYE
  'S.Diggs-NE-WR': 15.0,
  'N.Collins-HOU-WR': 14.0,
  'D.Moore-CHI-WR': 15.5,
  'B.Thomas-JAX-WR': 14.5,
  'C.Sutton-DEN-WR': 13.0, // BYE

  // WRs - Tier 2
  'J.Reed-GB-WR': 14.0,
  'C.Watson-GB-WR': 12.0,
  'R.Doubs-GB-WR': 11.0,
  'T.McMillan-CAR-WR': 13.5,
  'X.Legette-CAR-WR': 11.5,
  'R.Odunze-CHI-WR': 12.5,
  'L.Burden-CHI-WR': 11.0,
  'L.McConkey-LAC-WR': 13.0,
  'K.Allen-LAC-WR': 12.5,
  'Q.Johnston-LAC-WR': 10.0,
  'K.Shakir-BUF-WR': 12.0,
  'K.Coleman-BUF-WR': 11.5,
  'C.Kirk-HOU-WR': 10.5,
  'C.Kupp-SEA-WR': 13.5, // BYE
  'J.Jennings-SF-WR': 12.0,
  'M.Mims-DEN-WR': 10.0, // BYE

  // WRs - Tier 3
  'D.Metcalf-PIT-WR': 11.0,
  'A.Thielen-PIT-WR': 9.5,
  'R.Pearsall-SF-WR': 9.0,
  'T.Atwell-LAR-WR': 7.5,
  'R.Shaheed-SEA-WR': 8.0, // BYE
  'J.Meyers-JAX-WR': 10.0,
  'T.Hunter-JAX-WR': 9.5,
  'T.Franklin-DEN-WR': 7.0, // BYE
  'D.Douglas-NE-WR': 8.5,
  'K.Boutte-NE-WR': 7.0,
  'D.Wicks-GB-WR': 8.0,
  'J.Dotson-PHI-WR': 7.5,

  // TEs - Tier 1
  'G.Kittle-SF-TE': 14.0,
  'D.Goedert-PHI-TE': 11.5,
  'E.Engram-DEN-TE': 10.0, // BYE

  // TEs - Tier 2
  'D.Schultz-HOU-TE': 9.5,
  'T.Higbee-LAR-TE': 8.5,
  'C.Kmet-CHI-TE': 9.0,
  'D.Kincaid-BUF-TE': 8.0,
  'P.Freiermuth-PIT-TE': 8.5,
  'H.Henry-NE-TE': 8.0,
  'T.Kraft-GB-TE': 9.5,

  // TEs - Tier 3
  'B.Strange-JAX-TE': 6.5,
  'T.Conklin-LAC-TE': 6.0,
  'W.Dissly-LAC-TE': 5.0,
  'C.Loveland-CHI-TE': 7.0,
  'L.Musgrave-GB-TE': 5.5,
  'D.Knox-BUF-TE': 5.0,
  'T.Tremble-CAR-TE': 5.5,
  'C.Stover-HOU-TE': 5.0,
  'J.Smith-PIT-TE': 6.0,
  'A.Barner-SEA-TE': 4.5, // BYE

  // Kickers
  'M.Prater-BUF-K': 8.5,
  'J.Elliott-PHI-K': 9.0,
  'C.Boswell-PIT-K': 9.5,
  'C.Dicker-LAC-K': 8.0,
  'J.Myers-SEA-K': 7.0, // BYE
  'E.Pineiro-SF-K': 8.5,
  'B.McManus-GB-K': 7.5,
  'C.Santos-CHI-K': 8.0,
  'K.Fairbairn-HOU-K': 7.5,
  'C.Cam-JAX-K': 7.0,
  'J.Lutz-DEN-K': 6.5, // BYE
  'A.Borregales-NE-K': 7.5,
  'H.Mevis-LAR-K': 8.0,
  'R.Fitzgerald-CAR-K': 7.0,

  // Defenses
  'BUF-DEF': 9.0,
  'PHI-DEF': 10.0,
  'DEN-DEF': 8.0, // BYE
  'LAC-DEF': 8.5,
  'PIT-DEF': 9.5,
  'SF-DEF': 8.0,
  'HOU-DEF': 9.0,
  'GB-DEF': 7.5,
  'SEA-DEF': 7.0, // BYE
  'CHI-DEF': 8.5,
  'LAR-DEF': 7.0,
  'NE-DEF': 8.0,
  'JAX-DEF': 7.5,
  'CAR-DEF': 6.5,
};

// Player tiers for sorting
export const PLAYER_TIERS: Record<string, 1 | 2 | 3 | 4> = {
  // QB Starters = 1, Backups = 2
  'J.Allen-BUF-QB': 1, 'J.Hurts-PHI-QB': 1, 'J.Herbert-LAC-QB': 1, 'M.Stafford-LAR-QB': 1,
  'B.Purdy-SF-QB': 1, 'J.Love-GB-QB': 1, 'C.Williams-CHI-QB': 1, 'C.Stroud-HOU-QB': 1,
  'T.Lawrence-JAX-QB': 1, 'D.Maye-NE-QB': 1, 'B.Nix-DEN-QB': 1, 'S.Darnold-SEA-QB': 1,
  'A.Rodgers-PIT-QB': 1, 'B.Young-CAR-QB': 1,
  // QB Backups
  'M.Trubisky-BUF-QB': 2, 'S.Howell-PHI-QB': 2, 'T.Lance-LAC-QB': 2, 'J.Garoppolo-LAR-QB': 2,
  'M.Jones-SF-QB': 2, 'D.Ridder-GB-QB': 2, 'T.Bagent-CHI-QB': 2, 'D.Mills-HOU-QB': 2,
  'N.Mullens-JAX-QB': 2, 'T.DeVito-NE-QB': 2, 'S.Ehlinger-DEN-QB': 2, 'D.Lock-SEA-QB': 2,
  'W.Howard-PIT-QB': 2, 'A.Dalton-CAR-QB': 2,

  // RB Tier 1
  'S.Barkley-PHI-RB': 1, 'C.McCaffrey-SF-RB': 1, 'J.Jacobs-GB-RB': 1, 'K.Williams-LAR-RB': 1,
  'K.Walker-SEA-RB': 1, 'J.Cook-BUF-RB': 1,
  // RB Tier 2
  'T.Etienne-JAX-RB': 2, 'D.Swift-CHI-RB': 2, 'R.Stevenson-NE-RB': 2, 'R.Dowdle-CAR-RB': 2,
  'C.Hubbard-CAR-RB': 2, 'O.Hampton-LAC-RB': 2, 'R.Harvey-DEN-RB': 2, 'N.Chubb-HOU-RB': 2,
  // RB Tier 3
  'J.Warren-PIT-RB': 3, 'K.Gainwell-PIT-RB': 3, 'T.Henderson-NE-RB': 3, 'B.Corum-LAR-RB': 3,
  'Z.Charbonnet-SEA-RB': 3, 'I.Guerendo-SF-RB': 3, 'W.Marks-HOU-RB': 3, 'R.Davis-BUF-RB': 3,
  'T.Bigsby-PHI-RB': 3, 'T.Etienne-CAR-RB': 3, 'L.Allen-JAX-RB': 3, 'E.Wilson-GB-RB': 3,
  'J.McLaughlin-DEN-RB': 3, 'K.Vidal-LAC-RB': 3, 'B.Robinson-SF-RB': 3,
  // RB Tier 4 (deep bench)
  'W.Shipley-PHI-RB': 4, 'A.Dillon-PHI-RB': 4, 'K.Monangai-CHI-RB': 4, 'T.Badie-DEN-RB': 4,
  'H.Haskins-LAC-RB': 4, 'J.Patterson-LAC-RB': 4, 'C.Brooks-GB-RB': 4, 'T.Homer-CHI-RB': 4,
  'D.Dallas-JAX-RB': 4, 'B.Tuten-JAX-RB': 4, 'K.Johnson-PIT-RB': 4, 'R.Rivers-LAR-RB': 4,
  'J.Hunter-LAR-RB': 4, 'J.James-SF-RB': 4, 'D.Johnson-NE-RB': 4, 'T.Johnson-BUF-RB': 4,
  'B.Brooks-HOU-RB': 4, 'J.Jordan-HOU-RB': 4, 'D.Ogunbowale-HOU-RB': 4,

  // WR Tier 1
  'A.Brown-PHI-WR': 1, 'D.Smith-PHI-WR': 1, 'P.Nacua-LAR-WR': 1, 'D.Adams-LAR-WR': 1,
  'J.Smith-Njigba-SEA-WR': 1, 'S.Diggs-NE-WR': 1, 'N.Collins-HOU-WR': 1, 'D.Moore-CHI-WR': 1,
  'B.Thomas-JAX-WR': 1, 'C.Sutton-DEN-WR': 1,
  // WR Tier 2
  'J.Reed-GB-WR': 2, 'C.Watson-GB-WR': 2, 'R.Doubs-GB-WR': 2, 'T.McMillan-CAR-WR': 2,
  'X.Legette-CAR-WR': 2, 'R.Odunze-CHI-WR': 2, 'L.Burden-CHI-WR': 2, 'L.McConkey-LAC-WR': 2,
  'K.Allen-LAC-WR': 2, 'Q.Johnston-LAC-WR': 2, 'K.Shakir-BUF-WR': 2, 'K.Coleman-BUF-WR': 2,
  'C.Kirk-HOU-WR': 2, 'C.Kupp-SEA-WR': 2, 'J.Jennings-SF-WR': 2, 'M.Mims-DEN-WR': 2,
  // WR Tier 3
  'D.Metcalf-PIT-WR': 3, 'A.Thielen-PIT-WR': 3, 'R.Pearsall-SF-WR': 3, 'T.Atwell-LAR-WR': 3,
  'R.Shaheed-SEA-WR': 3, 'J.Meyers-JAX-WR': 3, 'T.Hunter-JAX-WR': 3, 'P.Washington-JAX-WR': 3,
  'T.Franklin-DEN-WR': 3, 'D.Douglas-NE-WR': 3, 'K.Boutte-NE-WR': 3, 'D.Wicks-GB-WR': 3,
  'J.Dotson-PHI-WR': 3, 'T.Harris-LAC-WR': 3, 'J.Coker-CAR-WR': 3, 'R.Wilson-PIT-WR': 3,
  // WR Tier 4
  'B.Cooks-BUF-WR': 4, 'G.Davis-BUF-WR': 4, 'J.Palmer-BUF-WR': 4, 'T.Shavers-BUF-WR': 4,
  'D.Duvernay-CHI-WR': 4, 'O.Zaccheaus-CHI-WR': 4, 'P.Bryant-DEN-WR': 4, 'L.Humphrey-DEN-WR': 4,
  'B.Berrios-HOU-WR': 4, 'X.Hutchinson-HOU-WR': 4, 'J.Higgins-HOU-WR': 4, 'J.Noel-HOU-WR': 4,
  'J.Watson-HOU-WR': 4, 'D.Brown-JAX-WR': 4, 'T.Patrick-JAX-WR': 4, 'D.Davis-LAC-WR': 4,
  'K.Lambert-Smith-LAC-WR': 4, 'K.Mumpfield-LAR-WR': 4, 'B.Presley-LAR-WR': 4, 'J.Whittington-LAR-WR': 4,
  'X.Smith-LAR-WR': 4, 'B.Covey-PHI-WR': 4, 'C.Austin-PIT-WR': 4, 'S.Miller-PIT-WR': 4,
  'B.Skowronek-PIT-WR': 4, 'M.Valdes-Scantling-PIT-WR': 4, 'J.Bobo-SEA-WR': 4, 'D.Young-SEA-WR': 4,
  'K.Bourne-SF-WR': 4, 'S.Moore-SF-WR': 4, 'D.Robinson-SF-WR': 4, 'J.Watkins-SF-WR': 4,
  'M.Golden-GB-WR': 4, 'J.Horn-CAR-WR': 4, 'K.Williams-NE-WR': 4,

  // TE Tier 1
  'G.Kittle-SF-TE': 1, 'D.Goedert-PHI-TE': 1, 'E.Engram-DEN-TE': 1,
  // TE Tier 2
  'D.Schultz-HOU-TE': 2, 'T.Higbee-LAR-TE': 2, 'C.Kmet-CHI-TE': 2, 'D.Kincaid-BUF-TE': 2,
  'P.Freiermuth-PIT-TE': 2, 'H.Henry-NE-TE': 2, 'T.Kraft-GB-TE': 2,
  // TE Tier 3
  'B.Strange-JAX-TE': 3, 'T.Conklin-LAC-TE': 3, 'W.Dissly-LAC-TE': 3, 'C.Loveland-CHI-TE': 3,
  'L.Musgrave-GB-TE': 3, 'D.Knox-BUF-TE': 3, 'T.Tremble-CAR-TE': 3, 'C.Stover-HOU-TE': 3,
  'J.Smith-PIT-TE': 3, 'A.Barner-SEA-TE': 3,
  // TE Tier 4
  'G.Calcaterra-PHI-TE': 4, 'K.Granson-PHI-TE': 4, 'C.Latu-PHI-TE': 4, 'D.Allen-LAR-TE': 4,
  'C.Parkinson-LAR-TE': 4, 'N.Vannett-LAR-TE': 4, 'T.Ferguson-LAR-TE': 4, 'D.Smythe-CHI-TE': 4,
  'N.Adkins-DEN-TE': 4, 'A.Trautman-DEN-TE': 4, 'H.Bryant-HOU-TE': 4, 'H.Long-JAX-TE': 4,
  'Q.Morris-JAX-TE': 4, 'J.Mundt-JAX-TE': 4, 'J.Akins-JAX-TE': 4, 'O.Gadsden-LAC-TE': 4,
  'A.Hooper-NE-TE': 4, 'C.Dippre-NE-TE': 4, 'J.Westover-NE-TE': 4, 'C.Heyward-PIT-TE': 4,
  'J.Whyle-GB-TE': 4, 'M.Evans-CAR-TE': 4, 'J.Mitchell-CAR-TE': 4, 'J.Hawes-BUF-TE': 4,
  'K.Latu-BUF-TE': 4, 'L.Farrell-SF-TE': 4, 'J.Tonges-SF-TE': 4, 'N.Kallerup-SEA-TE': 4,
  'E.Saubert-SEA-TE': 4, 'L.Krull-DEN-TE': 4, 'M.Lewis-DEN-TE': 4, 'C.Lohner-DEN-TE': 4,
  'P.Murtagh-DEN-TE': 4, 'M.Lang-NE-TE': 4, 'T.Odukoya-NE-TE': 4, 'P.Herbert-JAX-TE': 4,
  'D.Parham-PIT-TE': 4, 'D.Washington-PIT-TE': 4, 'J.Bell-PIT-TE': 4, 'M.Sokol-PIT-TE': 4,
  'B.Jordan-HOU-TE': 4, 'L.Lachey-HOU-TE': 4, 'L.Pryor-HOU-TE': 4, 'T.Fisk-LAC-TE': 4,
  'T.Yassmin-LAC-TE': 4, 'E.Arroyo-SEA-TE': 4, 'S.Carlson-CHI-TE': 4, 'T.Gordon-CHI-TE': 4,
  'Q.Ismail-CHI-TE': 4, 'N.Kalinic-CHI-TE': 4, 'E.Jenkins-PHI-TE': 4, 'J.Sanders-CAR-TE': 4,
  'R.Dwelley-CAR-TE': 4, 'B.Pierre-CAR-TE': 4, 'B.Willis-SF-TE': 4, 'J.FitzPatrick-GB-TE': 4,
  'M.Castles-GB-TE': 4, 'D.Dabney-GB-TE': 4, 'M.Swinson-GB-TE': 4,

  // Kickers (all tier 1)
  'M.Prater-BUF-K': 1, 'J.Elliott-PHI-K': 1, 'C.Boswell-PIT-K': 1, 'C.Dicker-LAC-K': 1,
  'J.Myers-SEA-K': 1, 'E.Pineiro-SF-K': 1, 'B.McManus-GB-K': 1, 'C.Santos-CHI-K': 1,
  'K.Fairbairn-HOU-K': 1, 'C.Cam-JAX-K': 1, 'J.Lutz-DEN-K': 1, 'A.Borregales-NE-K': 1,
  'H.Mevis-LAR-K': 1, 'R.Fitzgerald-CAR-K': 1,

  // Defenses (all tier 1)
  'BUF-DEF': 1, 'PHI-DEF': 1, 'DEN-DEF': 1, 'LAC-DEF': 1, 'PIT-DEF': 1, 'SF-DEF': 1,
  'HOU-DEF': 1, 'GB-DEF': 1, 'SEA-DEF': 1, 'CHI-DEF': 1, 'LAR-DEF': 1, 'NE-DEF': 1,
  'JAX-DEF': 1, 'CAR-DEF': 1,
};

// Helper to get ESPN headshot URL
export function getPlayerHeadshotUrl(espnId: string): string {
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;
}

// Helper to get team logo URL
export function getTeamLogoUrl(team: string): string {
  const teamIds: Record<string, string> = {
    BUF: '2', PHI: '21', DEN: '7', LAC: '24', PIT: '23', SF: '25', HOU: '34',
    GB: '9', SEA: '26', CHI: '3', LAR: '14', NE: '17', JAX: '30', CAR: '29'
  };
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${team.toLowerCase()}.png`;
}

// Team colors for styling
export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  BUF: { primary: '#00338D', secondary: '#C60C30' },
  PHI: { primary: '#004C54', secondary: '#A5ACAF' },
  DEN: { primary: '#FB4F14', secondary: '#002244' },
  LAC: { primary: '#0080C6', secondary: '#FFC20E' },
  PIT: { primary: '#FFB612', secondary: '#101820' },
  SF: { primary: '#AA0000', secondary: '#B3995D' },
  HOU: { primary: '#03202F', secondary: '#A71930' },
  GB: { primary: '#203731', secondary: '#FFB612' },
  SEA: { primary: '#002244', secondary: '#69BE28' },
  CHI: { primary: '#0B162A', secondary: '#C83803' },
  LAR: { primary: '#003594', secondary: '#FFA300' },
  NE: { primary: '#002244', secondary: '#C60C30' },
  JAX: { primary: '#006778', secondary: '#D7A22A' },
  CAR: { primary: '#0085CA', secondary: '#101820' },
};
