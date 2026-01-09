// Fantasy points calculation engine

export type ScoringFormat = 'PPR' | 'HALF_PPR' | 'STANDARD';

export type ScoringSettings = {
  passing: {
    yards_per_point: number;
    touchdown: number;
    interception: number;
  };
  rushing: {
    yards_per_point: number;
    touchdown: number;
  };
  receiving: {
    yards_per_point: number;
    touchdown: number;
    reception: number;
  };
  fumbles: {
    lost: number;
  };
  kicking: {
    field_goal: number;
    extra_point: number;
  };
  defense: {
    touchdown: number;
    sack: number;
    interception: number;
    fumble_recovery: number;
    safety: number;
  };
};

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

const DEFAULT_POINTS_ALLOWED = (points: number) => {
  if (points === 0) return 10;
  if (points <= 6) return 7;
  if (points <= 13) return 4;
  if (points <= 20) return 1;
  if (points <= 27) return 0;
  if (points <= 34) return -1;
  return -4;
};

const BASE_SETTINGS: ScoringSettings = {
  passing: {
    yards_per_point: 25,
    touchdown: 4,
    interception: -2
  },
  rushing: {
    yards_per_point: 10,
    touchdown: 6
  },
  receiving: {
    yards_per_point: 10,
    touchdown: 6,
    reception: 1
  },
  fumbles: {
    lost: -2
  },
  kicking: {
    field_goal: 3,
    extra_point: 1
  },
  defense: {
    touchdown: 6,
    sack: 1,
    interception: 2,
    fumble_recovery: 2,
    safety: 2
  }
};

export function getDefaultScoringSettings(format: ScoringFormat = 'PPR'): ScoringSettings {
  const reception = format === 'PPR' ? 1 : format === 'HALF_PPR' ? 0.5 : 0;
  return {
    ...BASE_SETTINGS,
    receiving: {
      ...BASE_SETTINGS.receiving,
      reception
    }
  };
}

export function normalizeScoringSettings(
  format: ScoringFormat,
  settings?: Partial<ScoringSettings> | null
): ScoringSettings {
  const base = getDefaultScoringSettings(format);
  if (!settings || typeof settings !== 'object') return base;
  return {
    passing: { ...base.passing, ...settings.passing },
    rushing: { ...base.rushing, ...settings.rushing },
    receiving: { ...base.receiving, ...settings.receiving },
    fumbles: { ...base.fumbles, ...settings.fumbles },
    kicking: { ...base.kicking, ...settings.kicking },
    defense: { ...base.defense, ...settings.defense }
  };
}

export function calculateFantasyPointsWithSettings(
  stats: PlayerStats,
  settings: ScoringSettings
): number {
  let points = 0;

  if (stats.passingYards) {
    points += stats.passingYards / settings.passing.yards_per_point;
  }
  if (stats.passingTouchdowns) {
    points += stats.passingTouchdowns * settings.passing.touchdown;
  }
  if (stats.interceptions) {
    points += stats.interceptions * settings.passing.interception;
  }

  if (stats.rushingYards) {
    points += stats.rushingYards / settings.rushing.yards_per_point;
  }
  if (stats.rushingTouchdowns) {
    points += stats.rushingTouchdowns * settings.rushing.touchdown;
  }

  if (stats.receivingYards) {
    points += stats.receivingYards / settings.receiving.yards_per_point;
  }
  if (stats.receivingTouchdowns) {
    points += stats.receivingTouchdowns * settings.receiving.touchdown;
  }
  if (stats.receptions) {
    points += stats.receptions * settings.receiving.reception;
  }

  if (stats.fumblesLost) {
    points += stats.fumblesLost * settings.fumbles.lost;
  }

  if (stats.fieldGoalsMade) {
    points += stats.fieldGoalsMade * settings.kicking.field_goal;
  }
  if (stats.extraPointsMade) {
    points += stats.extraPointsMade * settings.kicking.extra_point;
  }

  if (stats.defensiveTouchdowns) {
    points += stats.defensiveTouchdowns * settings.defense.touchdown;
  }
  if (stats.sacks) {
    points += stats.sacks * settings.defense.sack;
  }
  if (stats.interceptionsMade) {
    points += stats.interceptionsMade * settings.defense.interception;
  }
  if (stats.fumblesRecovered) {
    points += stats.fumblesRecovered * settings.defense.fumble_recovery;
  }
  if (stats.safeties) {
    points += stats.safeties * settings.defense.safety;
  }
  if (stats.pointsAllowed !== undefined) {
    points += DEFAULT_POINTS_ALLOWED(stats.pointsAllowed);
  }

  return Math.round(points * 100) / 100;
}

export function calculateFantasyPoints(
  stats: PlayerStats,
  format: ScoringFormat = 'PPR',
  settings?: Partial<ScoringSettings> | null
): number {
  const normalized = normalizeScoringSettings(format, settings);
  return calculateFantasyPointsWithSettings(stats, normalized);
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
