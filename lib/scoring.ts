// Fantasy points calculation engine

export type ScoringFormat = 'PPR' | 'HALF_PPR' | 'STANDARD';

export interface PlayerStats {
  // Passing
  passingYards?: number;
  passingTouchdowns?: number;
  interceptions?: number;

  // Rushing
  rushingYards?: number;
  rushingTouchdowns?: number;

  // Receiving
  receivingYards?: number;
  receivingTouchdowns?: number;
  receptions?: number;

  // General
  fumblesLost?: number;

  // Kicking
  fieldGoalsMade?: number;
  extraPointsMade?: number;

  // Defense/Special Teams
  defensiveTouchdowns?: number;
  interceptionTouchdowns?: number;
  fumbleReturnTouchdowns?: number;
  kickoffReturnTouchdowns?: number;
  puntReturnTouchdowns?: number;
  pointsAllowed?: number;
  yardsAllowed?: number;
  sacks?: number;
  interceptionsMade?: number;
  fumblesRecovered?: number;
  safeties?: number;
}

// PPR scoring rules
const PPR_SCORING = {
  passing: {
    yards: 1 / 25,      // 0.04 pts per yard (1 pt per 25 yds)
    touchdowns: 4,
    interceptions: -2
  },
  rushing: {
    yards: 1 / 10,      // 0.1 pts per yard (1 pt per 10 yds)
    touchdowns: 6
  },
  receiving: {
    yards: 1 / 10,      // 0.1 pts per yard
    touchdowns: 6,
    receptions: 1       // PPR
  },
  fumbles: {
    lost: -2
  },
  kicking: {
    fieldGoalsMade: 3,
    extraPointsMade: 1
  },
  defense: {
    touchdown: 6,
    sack: 1,
    interception: 2,
    fumbleRecovery: 2,
    safety: 2,
    pointsAllowed: (points: number) => {
      if (points === 0) return 10;
      if (points <= 6) return 7;
      if (points <= 13) return 4;
      if (points <= 20) return 1;
      if (points <= 27) return 0;
      if (points <= 34) return -1;
      return -4;
    }
  }
};

export function calculateFantasyPoints(
  stats: PlayerStats,
  format: ScoringFormat = 'PPR'
): number {
  let points = 0;

  // Passing
  if (stats.passingYards) {
    points += stats.passingYards * PPR_SCORING.passing.yards;
  }
  if (stats.passingTouchdowns) {
    points += stats.passingTouchdowns * PPR_SCORING.passing.touchdowns;
  }
  if (stats.interceptions) {
    points += stats.interceptions * PPR_SCORING.passing.interceptions;
  }

  // Rushing
  if (stats.rushingYards) {
    points += stats.rushingYards * PPR_SCORING.rushing.yards;
  }
  if (stats.rushingTouchdowns) {
    points += stats.rushingTouchdowns * PPR_SCORING.rushing.touchdowns;
  }

  // Receiving
  if (stats.receivingYards) {
    points += stats.receivingYards * PPR_SCORING.receiving.yards;
  }
  if (stats.receivingTouchdowns) {
    points += stats.receivingTouchdowns * PPR_SCORING.receiving.touchdowns;
  }
  if (stats.receptions) {
    const receptionPoints = format === 'PPR' ? 1 : format === 'HALF_PPR' ? 0.5 : 0;
    points += stats.receptions * receptionPoints;
  }

  // Fumbles
  if (stats.fumblesLost) {
    points += stats.fumblesLost * PPR_SCORING.fumbles.lost;
  }

  // Kicking
  if (stats.fieldGoalsMade) {
    points += stats.fieldGoalsMade * PPR_SCORING.kicking.fieldGoalsMade;
  }
  if (stats.extraPointsMade) {
    points += stats.extraPointsMade * PPR_SCORING.kicking.extraPointsMade;
  }

  // Defense/ST
  if (stats.defensiveTouchdowns) {
    points += stats.defensiveTouchdowns * PPR_SCORING.defense.touchdown;
  }
  if (stats.sacks) {
    points += stats.sacks * PPR_SCORING.defense.sack;
  }
  if (stats.interceptionsMade) {
    points += stats.interceptionsMade * PPR_SCORING.defense.interception;
  }
  if (stats.fumblesRecovered) {
    points += stats.fumblesRecovered * PPR_SCORING.defense.fumbleRecovery;
  }
  if (stats.safeties) {
    points += stats.safeties * PPR_SCORING.defense.safety;
  }
  if (stats.pointsAllowed !== undefined) {
    points += PPR_SCORING.defense.pointsAllowed(stats.pointsAllowed);
  }

  return Math.round(points * 100) / 100; // Round to 2 decimals
}

// Parse ESPN stats array into our PlayerStats format
export function parseESPNStats(labels: string[], values: string[]): PlayerStats {
  const stats: PlayerStats = {};

  labels.forEach((label, index) => {
    const value = parseFloat(values[index]) || 0;

    switch (label.toLowerCase()) {
      case 'c/att':
      case 'passing completions':
        // We don't track completions separately
        break;
      case 'yds':
      case 'passing yards':
        stats.passingYards = value;
        break;
      case 'td':
      case 'passing touchdowns':
        stats.passingTouchdowns = value;
        break;
      case 'int':
      case 'interceptions thrown':
        stats.interceptions = value;
        break;
      case 'car':
      case 'rushing attempts':
        // We don't track attempts
        break;
      case 'rushing yards':
        stats.rushingYards = value;
        break;
      case 'rushing touchdowns':
        stats.rushingTouchdowns = value;
        break;
      case 'rec':
      case 'receptions':
        stats.receptions = value;
        break;
      case 'receiving yards':
        stats.receivingYards = value;
        break;
      case 'receiving touchdowns':
        stats.receivingTouchdowns = value;
        break;
      case 'fl':
      case 'fumbles lost':
        stats.fumblesLost = value;
        break;
      case 'fg':
      case 'field goals made':
        stats.fieldGoalsMade = value;
        break;
      case 'xp':
      case 'extra points made':
        stats.extraPointsMade = value;
        break;
    }
  });

  return stats;
}

// Calculate total score for a roster
export interface RosterScore {
  totalPoints: number;
  breakdown: {
    position: string;
    playerKey: string;
    basePoints: number;
    multiplier: number;
    finalPoints: number;
  }[];
}

export function calculateRosterScore(
  roster: {
    qb_player_key: string | null; qb_weeks_held: number;
    rb1_player_key: string | null; rb1_weeks_held: number;
    rb2_player_key: string | null; rb2_weeks_held: number;
    wr1_player_key: string | null; wr1_weeks_held: number;
    wr2_player_key: string | null; wr2_weeks_held: number;
    te_player_key: string | null; te_weeks_held: number;
    k_player_key: string | null; k_weeks_held: number;
    dst_player_key: string | null; dst_weeks_held: number;
  },
  playerScores: Map<string, number>
): RosterScore {
  const breakdown: RosterScore['breakdown'] = [];
  let totalPoints = 0;

  const positions = [
    { key: roster.qb_player_key, multiplier: roster.qb_weeks_held, pos: 'QB' },
    { key: roster.rb1_player_key, multiplier: roster.rb1_weeks_held, pos: 'RB1' },
    { key: roster.rb2_player_key, multiplier: roster.rb2_weeks_held, pos: 'RB2' },
    { key: roster.wr1_player_key, multiplier: roster.wr1_weeks_held, pos: 'WR1' },
    { key: roster.wr2_player_key, multiplier: roster.wr2_weeks_held, pos: 'WR2' },
    { key: roster.te_player_key, multiplier: roster.te_weeks_held, pos: 'TE' },
    { key: roster.k_player_key, multiplier: roster.k_weeks_held, pos: 'K' },
    { key: roster.dst_player_key, multiplier: roster.dst_weeks_held, pos: 'DST' },
  ];

  positions.forEach(({ key, multiplier, pos }) => {
    if (!key) return;

    const basePoints = playerScores.get(key) || 0;
    const finalPoints = basePoints * multiplier;

    breakdown.push({
      position: pos,
      playerKey: key,
      basePoints,
      multiplier,
      finalPoints
    });

    totalPoints += finalPoints;
  });

  return {
    totalPoints: Math.round(totalPoints * 100) / 100,
    breakdown
  };
}
