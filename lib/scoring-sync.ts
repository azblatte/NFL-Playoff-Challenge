// Automated scoring sync orchestration
import { supabase } from './supabase';
import { getActivePlayoffGames, getGameStats } from './espn-api';
import { calculateFantasyPoints, parseESPNStats } from './scoring';

export interface SyncResult {
  success: boolean;
  gamesProcessed: number;
  playersUpdated: number;
  errors: string[];
}

export async function syncScores(round: 'WC' | 'DIV' | 'CONF' | 'SB'): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    gamesProcessed: 0,
    playersUpdated: 0,
    errors: []
  };

  try {
    // Get active playoff games
    const games = await getActivePlayoffGames();
    console.log(`Found ${games.length} active playoff games`);

    for (const game of games) {
      try {
        const gameId = game.id;
        result.gamesProcessed++;

        // Fetch detailed stats for this game
        const gameSummary = await getGameStats(gameId);

        if (!gameSummary.boxscore?.players) {
          console.log(`No boxscore data for game ${gameId}`);
          continue;
        }

        // Process each team's players
        for (const teamData of gameSummary.boxscore.players) {
          const teamAbbrev = teamData.team.abbreviation;

          // Process each stat category (passing, rushing, etc.)
          for (const statCategory of teamData.statistics) {
            for (const athleteStats of statCategory.athletes) {
              const espnId = athleteStats.athlete.id;
              const playerName = athleteStats.athlete.displayName;

              // Look up player in our database by espn_id
              const { data: player } = await supabase
                .from('player_pool')
                .select('player_key, position, team')
                .eq('espn_id', espnId)
                .single();

              if (!player) {
                console.log(`Player not found: ${playerName} (ESPN ID: ${espnId})`);
                continue;
              }

              // Parse stats
              const stats = parseESPNStats(
                athleteStats.labels || [],
                athleteStats.stats || []
              );

              // Calculate fantasy points
              const points = calculateFantasyPoints(stats, 'PPR');

              // Upsert to player_scores
              const { error: upsertError } = await supabase
                .from('player_scores')
                .upsert({
                  player_key: player.player_key,
                  espn_game_id: gameId,
                  round,
                  points,
                  stats: stats,
                  last_synced_at: new Date().toISOString()
                }, {
                  onConflict: 'player_key,round'
                });

              if (upsertError) {
                result.errors.push(`Error upserting ${player.player_key}: ${upsertError.message}`);
              } else {
                result.playersUpdated++;
                console.log(`Updated ${player.player_key}: ${points} pts`);
              }
            }
          }
        }

        // Update game status in playoff_schedule
        const gameStatus = game.competitions[0]?.status.type;
        const status = gameStatus.completed ? 'final' :
                      gameStatus.state === 'in' ? 'in_progress' : 'scheduled';

        await supabase
          .from('playoff_schedule')
          .update({ status })
          .eq('espn_game_id', gameId);

      } catch (gameError) {
        const errorMsg = `Error processing game ${game.id}: ${gameError}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Fatal error: ${error}`);
    console.error('Sync failed:', error);
  }

  return result;
}

// Manual sync for a specific game
export async function syncGame(gameId: string, round: 'WC' | 'DIV' | 'CONF' | 'SB'): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    gamesProcessed: 0,
    playersUpdated: 0,
    errors: []
  };

  try {
    result.gamesProcessed = 1;
    const gameSummary = await getGameStats(gameId);

    if (!gameSummary.boxscore?.players) {
      result.errors.push('No boxscore data available');
      return result;
    }

    // Process players (same logic as above)
    for (const teamData of gameSummary.boxscore.players) {
      for (const statCategory of teamData.statistics) {
        for (const athleteStats of statCategory.athletes) {
          const espnId = athleteStats.athlete.id;

          const { data: player } = await supabase
            .from('player_pool')
            .select('player_key')
            .eq('espn_id', espnId)
            .single();

          if (!player) continue;

          const stats = parseESPNStats(
            athleteStats.labels || [],
            athleteStats.stats || []
          );

          const points = calculateFantasyPoints(stats, 'PPR');

          const { error } = await supabase
            .from('player_scores')
            .upsert({
              player_key: player.player_key,
              espn_game_id: gameId,
              round,
              points,
              stats,
              last_synced_at: new Date().toISOString()
            }, {
              onConflict: 'player_key,round'
            });

          if (!error) {
            result.playersUpdated++;
          }
        }
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Error: ${error}`);
  }

  return result;
}
