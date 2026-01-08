// ESPN Public API integration
// No API key required - these are public endpoints

export interface ESPNGame {
  id: string;
  name: string;
  shortName: string;
  date: string;
  competitions: {
    id: string;
    competitors: {
      team: {
        abbreviation: string;
        displayName: string;
      };
      homeAway: 'home' | 'away';
    }[];
    status: {
      type: {
        name: string;
        state: string;
        completed: boolean;
      };
    };
  }[];
}

export interface ESPNScoreboardResponse {
  events: ESPNGame[];
}

export interface ESPNPlayerStats {
  athlete: {
    id: string;
    displayName: string;
  };
  stats: string[];
  labels: string[];
}

export interface ESPNGameSummary {
  boxscore: {
    players: {
      team: {
        abbreviation: string;
      };
      statistics: {
        name: string;
        athletes: ESPNPlayerStats[];
      }[];
    }[];
  };
}

// Fetch current NFL scoreboard
export async function getScoreboard(): Promise<ESPNScoreboardResponse> {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

  try {
    const response = await fetch(url, {
      next: { revalidate: 120 } // Cache for 2 minutes
    });

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    throw error;
  }
}

// Fetch game summary with player stats
export async function getGameStats(gameId: string): Promise<ESPNGameSummary> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ESPN API error for game ${gameId}: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching game ${gameId}:`, error);
    throw error;
  }
}

// Get playoff games only (postseason)
export async function getPlayoffGames(): Promise<ESPNGame[]> {
  const scoreboard = await getScoreboard();

  // Filter for postseason games
  return scoreboard.events.filter(event => {
    // Check if it's a playoff game (you may need to adjust this logic)
    return true; // For now, return all games during playoff season
  });
}

// Get active (in-progress or upcoming) playoff games
export async function getActivePlayoffGames(): Promise<ESPNGame[]> {
  const games = await getPlayoffGames();

  return games.filter(game => {
    const status = game.competitions[0]?.status.type.state;
    return status === 'in' || status === 'pre';
  });
}
