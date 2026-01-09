import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ROUNDS = ['WC', 'DIV', 'CONF', 'SB'] as const;
type Round = typeof ROUNDS[number];

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (set by Vercel)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current round from app_settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'current_round')
      .single();

    if (settingsError || !settingsData) {
      return NextResponse.json({ error: 'Could not get current round' }, { status: 500 });
    }

    const currentRound = (typeof settingsData.value === 'string'
      ? settingsData.value : JSON.stringify(settingsData.value)).replace(/"/g, '') as Round;

    console.log(`Auto-advance check for round: ${currentRound}`);

    // Check if all games in current round are final
    const { data: games, error: gamesError } = await supabase
      .from('playoff_schedule')
      .select('status')
      .eq('round', currentRound);

    if (gamesError) {
      return NextResponse.json({ error: gamesError.message }, { status: 500 });
    }

    // If no games scheduled, we can't auto-advance yet
    if (!games || games.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No games scheduled for this round yet',
        advanced: false
      });
    }

    // Check if ALL games are final
    const allFinal = games.every(g => g.status === 'final');
    const inProgress = games.some(g => g.status === 'in_progress');

    if (!allFinal) {
      return NextResponse.json({
        success: true,
        message: inProgress
          ? 'Games still in progress'
          : 'Not all games are final yet',
        gamesTotal: games.length,
        gamesFinal: games.filter(g => g.status === 'final').length,
        advanced: false
      });
    }

    // All games are final - time to advance!
    const currentIndex = ROUNDS.indexOf(currentRound);
    if (currentIndex >= ROUNDS.length - 1) {
      return NextResponse.json({
        success: true,
        message: 'Season complete - Super Bowl was final round',
        advanced: false
      });
    }

    const nextRound = ROUNDS[currentIndex + 1];

    // We need the next round schedule to know which teams advanced
    const { data: nextRoundGames, error: nextRoundError } = await supabase
      .from('playoff_schedule')
      .select('home_team, away_team')
      .eq('round', nextRound);

    if (nextRoundError) {
      return NextResponse.json({ error: nextRoundError.message }, { status: 500 });
    }

    if (!nextRoundGames || nextRoundGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Next round (${nextRound}) schedule not loaded yet`,
        advanced: false
      });
    }

    // Get all rosters for current round
    const { data: currentRosters, error: rostersError } = await supabase
      .from('rosters')
      .select('*')
      .eq('round', currentRound);

    if (rostersError) {
      return NextResponse.json({ error: rostersError.message }, { status: 500 });
    }

    if (!currentRosters || currentRosters.length === 0) {
      // No rosters to advance, just update the round
      await supabase
        .from('app_settings')
        .update({ value: JSON.stringify(nextRound), updated_at: new Date().toISOString() })
        .eq('key', 'current_round');

      return NextResponse.json({
        success: true,
        message: `Advanced to ${nextRound} (no rosters to copy)`,
        advanced: true,
        nextRound
      });
    }

    // Teams that advanced are the teams scheduled in the next round
    const activeTeams = new Set<string>();
    nextRoundGames.forEach(game => {
      activeTeams.add(game.home_team);
      activeTeams.add(game.away_team);
    });

    // Create new rosters for next round
    // IMPORTANT: Only increment multiplier if player was on roster in previous round
    // and their team is still active (won their game)
    const newRosters = currentRosters.map(r => {
      const checkSlot = (playerKey: string | null, weeksHeld: number) => {
        if (!playerKey) return { key: null, weeks: 1 };

        // Get team from player_key format (e.g., "J.Allen-BUF-QB" -> "BUF")
        const parts = playerKey.split('-');
        const team = parts.length >= 2 ? parts[parts.length - 2] : '';

        // Player's team won (still active) - increment multiplier
        if (activeTeams.has(team)) {
          return { key: playerKey, weeks: Math.min(weeksHeld + 1, 4) };
        }

        // Player's team lost - they're eliminated, clear the slot
        return { key: null, weeks: 1 };
      };

      const qb = checkSlot(r.qb_player_key, r.qb_weeks_held);
      const rb1 = checkSlot(r.rb1_player_key, r.rb1_weeks_held);
      const rb2 = checkSlot(r.rb2_player_key, r.rb2_weeks_held);
      const wr1 = checkSlot(r.wr1_player_key, r.wr1_weeks_held);
      const wr2 = checkSlot(r.wr2_player_key, r.wr2_weeks_held);
      const te = checkSlot(r.te_player_key, r.te_weeks_held);
      const k = checkSlot(r.k_player_key, r.k_weeks_held);
      const dst = checkSlot(r.dst_player_key, r.dst_weeks_held);

      return {
        user_id: r.user_id,
        league_id: r.league_id,
        round: nextRound,
        qb_player_key: qb.key,
        qb_weeks_held: qb.weeks,
        rb1_player_key: rb1.key,
        rb1_weeks_held: rb1.weeks,
        rb2_player_key: rb2.key,
        rb2_weeks_held: rb2.weeks,
        wr1_player_key: wr1.key,
        wr1_weeks_held: wr1.weeks,
        wr2_player_key: wr2.key,
        wr2_weeks_held: wr2.weeks,
        te_player_key: te.key,
        te_weeks_held: te.weeks,
        k_player_key: k.key,
        k_weeks_held: k.weeks,
        dst_player_key: dst.key,
        dst_weeks_held: dst.weeks,
        submitted_at: null,
        is_final: false,
      };
    });

    // Upsert new rosters
    const { error: insertError } = await supabase
      .from('rosters')
      .upsert(newRosters, { onConflict: 'user_id,league_id,round' });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update current round in app_settings
    const { error: updateError } = await supabase
      .from('app_settings')
      .update({ value: JSON.stringify(nextRound), updated_at: new Date().toISOString() })
      .eq('key', 'current_round');

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Advanced from ${currentRound} to ${nextRound}`,
      advanced: true,
      previousRound: currentRound,
      nextRound,
      rostersAdvanced: newRosters.length,
    });

  } catch (error: unknown) {
    console.error('Auto-advance error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
