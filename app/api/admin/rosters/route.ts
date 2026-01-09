import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function isAuthorized(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers.get('x-admin-password');
  return !!adminPassword && providedPassword === adminPassword;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get('league_id');
  const round = searchParams.get('round');
  const submittedOnly = searchParams.get('submitted') === '1';

  if (!leagueId) {
    return NextResponse.json({ error: 'Missing league_id' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let query = supabase
    .from('rosters')
    .select('id, user_id, league_id, round, submitted_at, qb_player_key, qb_weeks_held, rb1_player_key, rb1_weeks_held, rb2_player_key, rb2_weeks_held, wr1_player_key, wr1_weeks_held, wr2_player_key, wr2_weeks_held, te_player_key, te_weeks_held, k_player_key, k_weeks_held, dst_player_key, dst_weeks_held')
    .eq('league_id', leagueId);

  if (round) {
    query = query.eq('round', round);
  }
  if (submittedOnly) {
    query = query.not('submitted_at', 'is', null);
  }

  const { data: rosters, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = Array.from(new Set((rosters || []).map(r => r.user_id)));
  const [{ data: members }, { data: profiles }] = await Promise.all([
    supabase
      .from('league_members')
      .select('user_id, team_name')
      .eq('league_id', leagueId),
    userIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const teamNameMap = new Map<string, string>();
  members?.forEach(m => {
    if (m.team_name) teamNameMap.set(m.user_id, m.team_name);
  });

  const displayNameMap = new Map<string, string>();
  profiles?.forEach(p => {
    if (p.display_name) displayNameMap.set(p.id, p.display_name);
  });

  const enriched = (rosters || []).map(r => ({
    ...r,
    team_name: teamNameMap.get(r.user_id) || null,
    display_name: displayNameMap.get(r.user_id) || null,
  }));

  return NextResponse.json({ rosters: enriched });
}

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    id?: string;
    roster?: Record<string, string | null>;
    keepSubmittedAt?: boolean;
  } | null;

  if (!body?.id || !body.roster) {
    return NextResponse.json({ error: 'Missing roster update data' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: existing, error: fetchError } = await supabase
    .from('rosters')
    .select('*')
    .eq('id', body.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
  }

  const calcWeeksHeld = (slotKey: string, playerKey: string | null) => {
    if (!playerKey) return 1;
    const existingKey = existing[`${slotKey}_player_key`];
    const existingWeeks = existing[`${slotKey}_weeks_held`] || 1;
    return existingKey === playerKey ? existingWeeks : 1;
  };

  const updatePayload = {
    qb_player_key: body.roster.qb_player_key || null,
    qb_weeks_held: calcWeeksHeld('qb', body.roster.qb_player_key || null),
    rb1_player_key: body.roster.rb1_player_key || null,
    rb1_weeks_held: calcWeeksHeld('rb1', body.roster.rb1_player_key || null),
    rb2_player_key: body.roster.rb2_player_key || null,
    rb2_weeks_held: calcWeeksHeld('rb2', body.roster.rb2_player_key || null),
    wr1_player_key: body.roster.wr1_player_key || null,
    wr1_weeks_held: calcWeeksHeld('wr1', body.roster.wr1_player_key || null),
    wr2_player_key: body.roster.wr2_player_key || null,
    wr2_weeks_held: calcWeeksHeld('wr2', body.roster.wr2_player_key || null),
    te_player_key: body.roster.te_player_key || null,
    te_weeks_held: calcWeeksHeld('te', body.roster.te_player_key || null),
    k_player_key: body.roster.k_player_key || null,
    k_weeks_held: calcWeeksHeld('k', body.roster.k_player_key || null),
    dst_player_key: body.roster.dst_player_key || null,
    dst_weeks_held: calcWeeksHeld('dst', body.roster.dst_player_key || null),
    submitted_at: body.keepSubmittedAt && existing.submitted_at ? existing.submitted_at : new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('rosters')
    .update(updatePayload)
    .eq('id', body.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rosterId = searchParams.get('id');
  if (!rosterId) {
    return NextResponse.json({ error: 'Missing roster id' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error } = await supabase
    .from('rosters')
    .delete()
    .eq('id', rosterId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
