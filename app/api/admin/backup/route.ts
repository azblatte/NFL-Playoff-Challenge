import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';

type RosterWithProfile = {
  user_id: string;
  league_id: string;
  round: string;
  submitted_at: string | null;
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
  profiles: { display_name: string | null } | null;
};

export async function GET(req: Request) {
  // Check admin password from header
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers.get('x-admin-password');

  if (!adminPassword || providedPassword !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get URL params
  const { searchParams } = new URL(req.url);
  const leagueIdParam = searchParams.get('league_id');
  const leagueId = leagueIdParam && leagueIdParam !== DEFAULT_LEAGUE_ID ? leagueIdParam : null;
  const round = searchParams.get('round') || 'WC';

  try {
    // Get all rosters with player info
    let rostersQuery = supabase
      .from('rosters')
      .select(`
        id,
        user_id,
        league_id,
        round,
        submitted_at,
        qb_player_key,
        qb_weeks_held,
        rb1_player_key,
        rb1_weeks_held,
        rb2_player_key,
        rb2_weeks_held,
        wr1_player_key,
        wr1_weeks_held,
        wr2_player_key,
        wr2_weeks_held,
        te_player_key,
        te_weeks_held,
        k_player_key,
        k_weeks_held,
        dst_player_key,
        dst_weeks_held,
        profiles:user_id (display_name)
      `)
      .eq('round', round);

    if (leagueId) {
      rostersQuery = rostersQuery.eq('league_id', leagueId);
    }

    const { data: rostersData, error: rostersError } = await rostersQuery;

    if (rostersError) {
      return NextResponse.json({ error: rostersError.message }, { status: 500 });
    }
    const rosters = (rostersData || []) as unknown as RosterWithProfile[];

    // Get team names from league_members
    let membersQuery = supabase
      .from('league_members')
      .select('user_id, league_id, team_name');

    if (leagueId) {
      membersQuery = membersQuery.eq('league_id', leagueId);
    }

    const { data: members } = await membersQuery;
    const teamNameMap = new Map<string, string>();
    members?.forEach(m => {
      const key = `${m.user_id}-${m.league_id}`;
      if (m.team_name) teamNameMap.set(key, m.team_name);
    });

    // Get league names
    const { data: leagues } = await supabase.from('leagues').select('id, name');
    const leagueNameMap = new Map<string, string>();
    leagues?.forEach(l => leagueNameMap.set(l.id, l.name));

    // Get player names
    const { data: players } = await supabase
      .from('player_pool')
      .select('player_key, full_name, team, position');
    const playerMap = new Map<string, { name: string; team: string; position: string }>();
    players?.forEach(p => playerMap.set(p.player_key, { name: p.full_name, team: p.team, position: p.position }));

    // Build CSV
    const headers = [
      'League',
      'Team Name',
      'Owner',
      'Round',
      'Submitted At',
      'QB',
      'QB Mult',
      'RB1',
      'RB1 Mult',
      'RB2',
      'RB2 Mult',
      'WR1',
      'WR1 Mult',
      'WR2',
      'WR2 Mult',
      'TE',
      'TE Mult',
      'K',
      'K Mult',
      'DST',
      'DST Mult',
    ];

    const rows = rosters.map(r => {
      const displayName = r.profiles?.display_name || 'Unknown';
      const teamNameKey = `${r.user_id}-${r.league_id}`;
      const teamName = teamNameMap.get(teamNameKey) || displayName;
      const leagueName = leagueNameMap.get(r.league_id) || r.league_id;

      const getPlayerName = (key: string | null) => {
        if (!key) return '';
        const p = playerMap.get(key);
        return p ? `${p.name} (${p.team})` : key;
      };

      return [
        leagueName,
        teamName,
        displayName,
        r.round,
        r.submitted_at || '',
        getPlayerName(r.qb_player_key),
        r.qb_weeks_held,
        getPlayerName(r.rb1_player_key),
        r.rb1_weeks_held,
        getPlayerName(r.rb2_player_key),
        r.rb2_weeks_held,
        getPlayerName(r.wr1_player_key),
        r.wr1_weeks_held,
        getPlayerName(r.wr2_player_key),
        r.wr2_weeks_held,
        getPlayerName(r.te_player_key),
        r.te_weeks_held,
        getPlayerName(r.k_player_key),
        r.k_weeks_held,
        getPlayerName(r.dst_player_key),
        r.dst_weeks_held,
      ];
    }) || [];

    // Escape CSV values
    const escapeCSV = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="rosters-backup-${round}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error('Backup error:', err);
    return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 });
  }
}
