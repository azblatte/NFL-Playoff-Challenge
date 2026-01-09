'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { normalizeScoringSettings, type ScoringSettings } from '@/lib/scoring';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const ACTIVE_LEAGUE_KEY = 'activeLeagueId';

type LeagueRow = {
  id: string;
  name: string;
  join_code: string | null;
  scoring_format: ScoringFormat;
  owner_user_id: string | null;
  scoring_settings: Partial<ScoringSettings> | null;
};

type ScoringFormat = 'PPR' | 'HALF_PPR' | 'STANDARD';

type MembershipRow = {
  league_id: string;
  role: 'owner' | 'admin' | 'member';
  team_name: string | null;
  leagues: LeagueRow | null;
};

type MemberRow = {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  team_name: string | null;
  profiles: { display_name: string | null } | null;
};

type RosterInfo = {
  id: string;
  round: string;
  submitted_at: string | null;
  is_final: boolean;
};

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default function LeaguePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [myRosters, setMyRosters] = useState<RosterInfo[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [joinCode, setJoinCode] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  const [createLeagueName, setCreateLeagueName] = useState('');
  const [createTeamName, setCreateTeamName] = useState('');
  const [createScoringFormat, setCreateScoringFormat] = useState<ScoringFormat>('PPR');
  const [adminLeagueName, setAdminLeagueName] = useState('');
  const [adminScoringFormat, setAdminScoringFormat] = useState<ScoringFormat>('PPR');
  const [adminFieldGoalPoints, setAdminFieldGoalPoints] = useState(3);
  const [adminExtraPointPoints, setAdminExtraPointPoints] = useState(1);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeMembership = useMemo(() => {
    return memberships.find((m) => m.leagues?.id === activeLeagueId) || null;
  }, [activeLeagueId, memberships]);

  const activeLeague = activeMembership?.leagues || null;
  const isOwner = activeLeague?.owner_user_id && user?.id === activeLeague.owner_user_id;
  const isAdmin = activeMembership?.role === 'admin' || !!isOwner;

  function showMessage(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  }

  function getErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null;
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUser(user);
    await loadMemberships(user.id);
    setLoading(false);
  }

  async function loadMemberships(userId: string) {
    // First get memberships
    const { data: memberData, error: memberError } = await supabase
      .from('league_members')
      .select('league_id, role, team_name')
      .eq('user_id', userId);

    if (memberError) {
      console.error('Member error:', memberError);
      showMessage(memberError.message, 'error');
      return;
    }

    if (!memberData || memberData.length === 0) {
      setMemberships([]);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_LEAGUE_KEY);
      }
      setActiveLeagueId(DEFAULT_LEAGUE_ID);
      return;
    }

    // Then get league details for each membership
    const leagueIds = memberData.map(m => m.league_id);
    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, join_code, scoring_format, owner_user_id, scoring_settings')
      .in('id', leagueIds);

    if (leagueError) {
      console.error('League error:', leagueError);
      showMessage(leagueError.message, 'error');
      return;
    }

    // Combine the data
    const leagueMap = new Map<string, LeagueRow>();
    leagueData?.forEach(l => leagueMap.set(l.id, l as LeagueRow));

    const rows: MembershipRow[] = memberData.map(m => ({
      league_id: m.league_id,
      role: m.role as 'owner' | 'admin' | 'member',
      team_name: m.team_name,
      leagues: leagueMap.get(m.league_id) || null,
    }));

    setMemberships(rows);

    if (typeof window === 'undefined') return;

    const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
    const savedValid = savedLeagueId && rows.some((m) => m.leagues?.id === savedLeagueId);
    if (savedValid) {
      setActiveLeagueId(savedLeagueId as string);
      return;
    }

    if (rows.length > 0 && rows[0].leagues?.id) {
      const nextId = rows[0].leagues.id;
      window.localStorage.setItem(ACTIVE_LEAGUE_KEY, nextId);
      setActiveLeagueId(nextId);
    }
  }

  async function loadMembers() {
    if (!user || !activeLeagueId) return;
    if (!activeMembership) {
      setMembers([]);
      return;
    }

    // Get members with their team names
    const { data: memberData, error: memberError } = await supabase
      .from('league_members')
      .select('user_id, role, team_name')
      .eq('league_id', activeLeagueId);

    if (memberError) {
      console.error('Load members error:', memberError);
      return;
    }

    if (!memberData) {
      setMembers([]);
      return;
    }

    // Get profile info
    const userIds = memberData.map(m => m.user_id);
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    const profileMap = new Map<string, string>();
    profileData?.forEach(p => profileMap.set(p.id, p.display_name || 'Unknown'));

    const rows: MemberRow[] = memberData.map(m => ({
      user_id: m.user_id,
      role: m.role as 'owner' | 'admin' | 'member',
      team_name: m.team_name,
      profiles: { display_name: profileMap.get(m.user_id) || null },
    }));

    setMembers(rows);
  }

  async function loadMyRosters() {
    if (!user || !activeLeagueId) return;

    const { data } = await supabase
      .from('rosters')
      .select('id, round, submitted_at, is_final')
      .eq('user_id', user.id)
      .eq('league_id', activeLeagueId);

    setMyRosters((data || []) as RosterInfo[]);
  }

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (savedLeagueId) setActiveLeagueId(savedLeagueId);
    }
  }, []);

  useEffect(() => {
    const league = memberships.find((m) => m.leagues?.id === activeLeagueId)?.leagues || null;
    if (league) {
      setAdminLeagueName(league.name);
      setAdminScoringFormat(league.scoring_format);
      const normalized = normalizeScoringSettings(league.scoring_format, league.scoring_settings || undefined);
      setAdminFieldGoalPoints(normalized.kicking.field_goal);
      setAdminExtraPointPoints(normalized.kicking.extra_point);
    }
  }, [activeLeagueId, memberships]);

  useEffect(() => {
    loadMembers();
    loadMyRosters();
  }, [activeLeagueId, memberships, user]);

  function handleSetActiveLeague(id: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_LEAGUE_KEY, id);
    }
    setActiveLeagueId(id);
    showMessage('Active league updated.', 'success');
  }

  function openLeagueLeaderboard(id: string) {
    handleSetActiveLeague(id);
    router.push('/leaderboard');
  }

  async function handleCreateLeague() {
    if (!user) return;
    setCreating(true);
    setMessage('');

    const name = createLeagueName.trim() || 'My League';
    let createdLeague: LeagueRow | null = null;

    for (let i = 0; i < 5; i += 1) {
      const joinCode = generateJoinCode();
      const scoring_settings = normalizeScoringSettings(createScoringFormat, undefined);
      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name,
          scoring_format: createScoringFormat,
          join_code: joinCode,
          owner_user_id: user.id,
          scoring_settings
        })
        .select('id, name, join_code, scoring_format, owner_user_id, scoring_settings')
        .single();

      if (error) {
        if (getErrorCode(error) === '23505') continue;
        showMessage(error.message, 'error');
        setCreating(false);
        return;
      }

      createdLeague = data as LeagueRow;
      break;
    }

    if (!createdLeague) {
      showMessage('Could not generate a unique join code. Try again.', 'error');
      setCreating(false);
      return;
    }

    const teamName = createTeamName.trim() || user.user_metadata?.display_name || 'My Team';
    const { error: memberError } = await supabase
      .from('league_members')
      .insert({
        league_id: createdLeague.id,
        user_id: user.id,
        role: 'owner',
        team_name: teamName,
      });

    if (memberError) {
      showMessage(memberError.message, 'error');
      setCreating(false);
      return;
    }

    setCreateLeagueName('');
    setCreateTeamName('');
    await loadMemberships(user.id);
    handleSetActiveLeague(createdLeague.id);
    showMessage(`League created! Your join code is: ${createdLeague.join_code}`, 'success');
    setCreating(false);
  }

  async function handleJoinLeague() {
    if (!user) return;
    setSaving(true);
    setMessage('');

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      showMessage('Enter a join code.', 'error');
      setSaving(false);
      return;
    }

    if (!joinTeamName.trim()) {
      showMessage('Enter your team name.', 'error');
      setSaving(false);
      return;
    }

    const { data: league, error } = await supabase
      .from('leagues')
      .select('id, name, join_code, scoring_format, owner_user_id, scoring_settings')
      .eq('join_code', code)
      .single();

    if (error || !league) {
      showMessage('Join code not found. Check the code and try again.', 'error');
      setSaving(false);
      return;
    }

    const teamName = joinTeamName.trim();
    const { error: joinError } = await supabase
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
        role: 'member',
        team_name: teamName,
      });

    if (joinError) {
      if (getErrorCode(joinError) === '23505') {
        showMessage('You are already in this league.', 'error');
      } else {
        showMessage(joinError.message, 'error');
      }
      setSaving(false);
      return;
    }

    setJoinCode('');
    setJoinTeamName('');
    await loadMemberships(user.id);
    handleSetActiveLeague(league.id);
    showMessage(`Joined ${league.name}!`, 'success');
    setSaving(false);
  }

  async function handleUpdateLeague() {
    if (!user || !activeLeague || !isAdmin) return;
    setSaving(true);
    setMessage('');

    const nextSettings = normalizeScoringSettings(adminScoringFormat, activeLeague.scoring_settings || undefined);
    nextSettings.kicking.field_goal = adminFieldGoalPoints;
    nextSettings.kicking.extra_point = adminExtraPointPoints;
    const { error } = await supabase
      .from('leagues')
      .update({
        name: adminLeagueName.trim() || activeLeague.name,
        scoring_format: adminScoringFormat,
        scoring_settings: nextSettings,
      })
      .eq('id', activeLeague.id);

    if (error) {
      showMessage(error.message, 'error');
      setSaving(false);
      return;
    }

    await loadMemberships(user.id);
    showMessage('League settings updated.', 'success');
    setSaving(false);
  }

  async function handleCopyJoinCode() {
    if (!activeLeague?.join_code) return;
    try {
      await navigator.clipboard.writeText(activeLeague.join_code);
      showMessage('Join code copied to clipboard!', 'success');
    } catch {
      showMessage(`Join code: ${activeLeague.join_code}`, 'info');
    }
  }

  async function handleUpdateMemberRole(userId: string, role: 'admin' | 'member') {
    if (!isOwner || !activeLeague) return;
    setSaving(true);

    const { error } = await supabase
      .from('league_members')
      .update({ role })
      .eq('league_id', activeLeague.id)
      .eq('user_id', userId);

    if (error) {
      showMessage(error.message, 'error');
      setSaving(false);
      return;
    }

    await loadMembers();
    showMessage('Member role updated.', 'success');
    setSaving(false);
  }

  async function handleRemoveMember(userId: string) {
    if (!isOwner || !activeLeague) return;
    if (!confirm('Remove this member from the league?')) return;
    setSaving(true);

    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', activeLeague.id)
      .eq('user_id', userId);

    if (error) {
      showMessage(error.message, 'error');
      setSaving(false);
      return;
    }

    await loadMembers();
    showMessage('Member removed.', 'success');
    setSaving(false);
  }

  async function handleDeleteLeague(leagueId: string) {
    if (!user) return;
    const confirmed = window.confirm('Delete this league? This removes all rosters and members.');
    if (!confirmed) return;
    setSaving(true);

    const { error } = await supabase
      .from('leagues')
      .delete()
      .eq('id', leagueId);

    if (error) {
      showMessage(error.message, 'error');
      setSaving(false);
      return;
    }

    await loadMemberships(user.id);
    showMessage('League deleted.', 'success');
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏈</span>
            <div>
              <h1 className="text-xl font-bold text-white">League Hub</h1>
              <p className="text-slate-400 text-sm">Create, join, and manage leagues</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/roster"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition font-medium"
            >
              Edit Roster
            </Link>
            <Link
              href="/leaderboard"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
              Leaderboard
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl border ${
            messageType === 'success' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-200' :
            messageType === 'error' ? 'bg-red-900/50 border-red-700 text-red-200' :
            'bg-slate-800 border-slate-700 text-slate-200'
          }`}>
            {message}
          </div>
        )}

        {/* Your Leagues - Most Important Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Your Leagues</h2>
          {memberships.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400 text-lg mb-2">No leagues yet</div>
              <div className="text-slate-500 text-sm">Join an existing league with a code, or create your own below.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map((membership) => {
                const league = membership.leagues;
                if (!league) return null;
                const isActive = league.id === activeLeagueId;
                return (
                  <div
                    key={league.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openLeagueLeaderboard(league.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openLeagueLeaderboard(league.id);
                      }
                    }}
                    className={`p-4 rounded-lg border transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/60 ${isActive ? 'border-emerald-500 bg-emerald-900/30' : 'border-slate-600 bg-slate-900/50 hover:border-slate-500'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-lg">{league.name}</span>
                          {isActive && <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">Active</span>}
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">{membership.role}</span>
                        </div>
                        <div className="text-slate-400 text-sm mt-1">
                          Your team: <span className="text-white">{membership.team_name || 'Not set'}</span>
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          Join Code: <span className="font-mono text-slate-300">{league.join_code}</span> • {league.scoring_format}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openLeagueLeaderboard(league.id);
                          }}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition"
                        >
                          {isActive ? 'Open Leaderboard' : 'Go to Leaderboard'}
                        </button>
                        {isActive && (
                          <Link
                            href="/roster"
                            onClick={(event) => event.stopPropagation()}
                            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition"
                          >
                            Edit Roster
                          </Link>
                        )}
                        {membership.role === 'owner' && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteLeague(league.id);
                            }}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition"
                          >
                            Delete League
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Roster Status */}
        {activeLeague && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">My Roster in {activeLeague.name}</h2>
            {myRosters.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-yellow-400 text-lg mb-2">No roster submitted yet!</div>
                <div className="text-slate-400 text-sm mb-4">Pick your 8 players before the deadline.</div>
                <Link
                  href="/roster"
                  className="inline-block px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition"
                >
                  Build Your Roster
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {myRosters.map((roster) => (
                  <div key={roster.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                    <div>
                      <div className="text-white font-medium">
                        {roster.round === 'WC' ? 'Wild Card' : roster.round === 'DIV' ? 'Divisional' : roster.round === 'CONF' ? 'Conference' : 'Super Bowl'} Round
                      </div>
                      <div className="text-slate-400 text-sm">
                        {roster.submitted_at ? `Submitted: ${new Date(roster.submitted_at).toLocaleString()}` : 'Draft - not submitted'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {roster.is_final ? (
                        <span className="text-emerald-400 text-sm font-medium">Locked</span>
                      ) : (
                        <Link
                          href="/roster"
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Join / Create */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">Join a League</h2>
            <label className="block text-sm text-slate-400 mb-2">Join code (from league owner)</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              placeholder="ABC123"
            />
            <label className="block text-sm text-slate-400 mt-4 mb-2">Your team name *</label>
            <input
              value={joinTeamName}
              onChange={(e) => setJoinTeamName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              placeholder="e.g., The Underdogs"
            />
            <button
              onClick={handleJoinLeague}
              disabled={saving}
              className="mt-4 w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {saving ? 'Joining...' : 'Join League'}
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">Create a New League</h2>
            <label className="block text-sm text-slate-400 mb-2">League name</label>
            <input
              value={createLeagueName}
              onChange={(e) => setCreateLeagueName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              placeholder="My Playoff League"
            />
            <label className="block text-sm text-slate-400 mt-4 mb-2">Your team name</label>
            <input
              value={createTeamName}
              onChange={(e) => setCreateTeamName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              placeholder="e.g., Gridiron Gang"
            />
            <label className="block text-sm text-slate-400 mt-4 mb-2">Scoring format</label>
            <select
              value={createScoringFormat}
              onChange={(e) => setCreateScoringFormat(e.target.value as ScoringFormat)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
            >
              <option value="PPR">PPR (1 pt per reception)</option>
              <option value="HALF_PPR">Half PPR (0.5 pts)</option>
              <option value="STANDARD">Standard (no PPR)</option>
            </select>
            <button
              onClick={handleCreateLeague}
              disabled={creating}
              className="mt-4 w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create League'}
            </button>
          </div>
        </div>

        {/* League Admin Settings */}
        {activeLeague && isAdmin && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">League Settings</h2>
              <button
                onClick={handleCopyJoinCode}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 transition"
              >
                Copy Join Code: {activeLeague.join_code}
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Adjust league details and customize kicker scoring.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">League name</label>
                <input
                  value={adminLeagueName}
                  onChange={(e) => setAdminLeagueName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Scoring format</label>
                <select
                  value={adminScoringFormat}
                  onChange={(e) => setAdminScoringFormat(e.target.value as ScoringFormat)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="PPR">PPR</option>
                  <option value="HALF_PPR">Half PPR</option>
                  <option value="STANDARD">Standard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Field Goal Points</label>
                <input
                  type="number"
                  step="0.5"
                  value={adminFieldGoalPoints}
                  onChange={(e) => setAdminFieldGoalPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Extra Point Points</label>
                <input
                  type="number"
                  step="0.5"
                  value={adminExtraPointPoints}
                  onChange={(e) => setAdminExtraPointPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>
            </div>
            <button
              onClick={handleUpdateLeague}
              disabled={saving}
              className="mt-4 px-6 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Members List */}
        {activeLeague && members.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">League Members ({members.length})</h2>
            <div className="space-y-2">
              {members.map((member) => {
                const isSelf = member.user_id === user?.id;
                const isOwnerRole = member.role === 'owner';
                const displayName = member.profiles?.display_name || 'Unknown';
                const teamName = member.team_name || displayName;
                return (
                  <div key={member.user_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {teamName}
                        {isSelf && <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">You</span>}
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">{member.role}</span>
                      </div>
                      <div className="text-slate-400 text-sm">{displayName}</div>
                    </div>
                    {isOwner && !isOwnerRole && !isSelf && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateMemberRole(member.user_id, member.role === 'admin' ? 'member' : 'admin')}
                          className="px-3 py-1 rounded-lg bg-slate-700 text-white text-xs hover:bg-slate-600 transition"
                        >
                          {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs hover:bg-red-500 transition"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
