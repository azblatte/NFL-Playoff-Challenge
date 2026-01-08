// ESPN Roster Scraper
// Fetches player data from ESPN API to populate player_pool table

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PLAYOFF_TEAMS_2026, getESPNTeamAbbrev } from './playoff-teams.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ESPNAthlete {
  id: string;
  fullName: string;
  displayName: string;
  position: {
    abbreviation: string;
  };
  jersey?: string;
}

interface ESPNRosterResponse {
  athletes: {
    position: string;
    items: ESPNAthlete[];
  }[];
  team: {
    abbreviation: string;
    displayName: string;
  };
}

export interface PlayerSeedData {
  player_key: string;
  espn_id: string;
  full_name: string;
  team: string;
  position: string;
}

// Generate player_key from name, team, position
function generatePlayerKey(fullName: string, team: string, position: string): string {
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts[nameParts.length - 1] || '';

  const firstInitial = firstName.charAt(0).toUpperCase();
  const lastNameFormatted = lastName.replace(/[^a-zA-Z]/g, '');

  return `${firstInitial}.${lastNameFormatted}-${team}-${position}`;
}

// Fetch roster for a single team
async function fetchTeamRoster(teamAbbrev: string): Promise<PlayerSeedData[]> {
  const espnTeam = getESPNTeamAbbrev(teamAbbrev);
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnTeam}/roster`;

  try {
    console.log(`Fetching roster for ${teamAbbrev} (ESPN: ${espnTeam})...`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ESPN API returned ${response.status} for ${teamAbbrev}`);
    }

    const data: ESPNRosterResponse = await response.json();

    // Filter to relevant fantasy positions
    const relevantPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'D/ST', 'DEF'];

    // Flatten the nested structure (athletes is grouped by position group)
    const allAthletes = data.athletes.flatMap(group => group.items);

    const players: PlayerSeedData[] = allAthletes
      .filter(athlete => {
        const pos = athlete.position.abbreviation;
        return relevantPositions.includes(pos);
      })
      .map(athlete => {
        let position = athlete.position.abbreviation;

        // Normalize position names
        if (position === 'D/ST' || position === 'DEF') {
          position = 'DST';
        }

        const player_key = generatePlayerKey(athlete.fullName, teamAbbrev, position);

        return {
          player_key,
          espn_id: athlete.id,
          full_name: athlete.fullName,
          team: teamAbbrev,
          position,
        };
      });

    console.log(`✓ Found ${players.length} players for ${teamAbbrev}`);
    return players;

  } catch (error) {
    console.error(`✗ Error fetching roster for ${teamAbbrev}:`, error);
    return [];
  }
}

// Scrape all playoff teams
export async function scrapeAllPlayoffRosters(): Promise<PlayerSeedData[]> {
  console.log('\n🏈 Starting ESPN roster scrape for 2026 playoff teams...\n');

  const allPlayers: PlayerSeedData[] = [];
  const playerKeysSeen = new Set<string>();

  // Fetch rosters sequentially to avoid rate limiting
  for (const team of PLAYOFF_TEAMS_2026) {
    const players = await fetchTeamRoster(team.abbrev);

    // Check for duplicate player_keys and handle collisions
    for (const player of players) {
      let finalPlayerKey = player.player_key;
      let counter = 2;

      while (playerKeysSeen.has(finalPlayerKey)) {
        // Collision detected (e.g., two J.Smith-GB-WR)
        const [baseName, rest] = finalPlayerKey.split('-');
        finalPlayerKey = `${baseName}${counter}-${rest}`;
        counter++;
      }

      if (finalPlayerKey !== player.player_key) {
        console.log(`  ⚠ Collision resolved: ${player.player_key} → ${finalPlayerKey}`);
        player.player_key = finalPlayerKey;
      }

      playerKeysSeen.add(finalPlayerKey);
      allPlayers.push(player);
    }

    // Rate limit: wait 500ms between teams
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✓ Scraped ${allPlayers.length} total players from ${PLAYOFF_TEAMS_2026.length} teams\n`);

  // Summary by position
  const byPosition: Record<string, number> = {};
  allPlayers.forEach(p => {
    byPosition[p.position] = (byPosition[p.position] || 0) + 1;
  });

  console.log('Position breakdown:');
  Object.entries(byPosition).forEach(([pos, count]) => {
    console.log(`  ${pos}: ${count} players`);
  });
  console.log('');

  return allPlayers;
}

// Generate SQL INSERT statements
export function generateSQLInserts(players: PlayerSeedData[]): string {
  const values = players.map(p => {
    const escapedName = p.full_name.replace(/'/g, "''");
    return `('${p.player_key}', '${p.espn_id}', '${escapedName}', '${p.team}', '${p.position}', true)`;
  }).join(',\n  ');

  return `
-- Generated player_pool data from ESPN rosters
-- Generated at: ${new Date().toISOString()}
-- Total players: ${players.length}

INSERT INTO player_pool (player_key, espn_id, full_name, team, position, is_active)
VALUES
  ${values}
ON CONFLICT (player_key) DO UPDATE SET
  espn_id = EXCLUDED.espn_id,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;
`;
}

// Main execution - Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const players = await scrapeAllPlayoffRosters();
      const sql = generateSQLInserts(players);

      // Write to file
      const outputPath = path.join(__dirname, '../../supabase/migrations/002_seed_players.sql');

      fs.writeFileSync(outputPath, sql, 'utf-8');
      console.log(`✓ SQL insert statements written to: ${outputPath}`);
      console.log('\nNext steps:');
      console.log('1. Review the generated SQL file');
      console.log('2. Run it in Supabase SQL editor to seed player_pool table');

    } catch (error) {
      console.error('Error during scraping:', error);
      process.exit(1);
    }
  })();
}
