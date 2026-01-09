'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import { useAdminSession } from '@/components/AdminSessionProvider';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const ACTIVE_LEAGUE_KEY = 'activeLeagueId';

const ROUNDS = ['WC', 'DIV', 'CONF', 'SB'] as const;
type Round = typeof ROUNDS[number];

type LeagueOption = {
  id: string;
  name: string;
};

type AdminRoster = {
  id: string;
  user_id: string;
  league_id: string;
  round: Round;
  submitted_at: string | null;
  team_name: string | null;
  display_name: string | null;
  qb_player_key: string | null;
  rb1_player_key: string | null;
  rb2_player_key: string | null;
  wr1_player_key: string | null;
  wr2_player_key: string | null;
  te_player_key: string | null;
  k_player_key: string | null;
  dst_player_key: string | null;
};

type PlayerRow = {
  player_key: string;
  full_name: string;
  team: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
};

const ROSTER_SLOTS = [
  { key: 'qb_player_key', label: 'QB', position: 'QB' },
  { key: 'rb1_player_key', label: 'RB1', position: 'RB' },
  { key: 'rb2_player_key', label: 'RB2', position: 'RB' },
  { key: 'wr1_player_key', label: 'WR1', position: 'WR' },
  { key: 'wr2_player_key', label: 'WR2', position: 'WR' },
  { key: 'te_player_key', label: 'TE', position: 'TE' },
  { key: 'k_player_key', label: 'K', position: 'K' },
  { key: 'dst_player_key', label: 'DST', position: 'DST' },
] as const;

export default function AdminRostersPage() {
  const router = useRouter();
  const { adminUnlocked, adminPassword, setAdminUnlocked, setAdminPassword } = useAdminSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const [adminLeagues, setAdminLeagues] = useState<LeagueOption[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [currentRound, setCurrentRound] = useState<Round>('WC');
  const [submittedOnly, setSubmittedOnly] = useState(true);
  const [rosters, setRosters] = useState<AdminRoster[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null);
  const [editRoster, setEditRoster] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkUser();
    if (typeof window !== 'undefined') {
      const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (savedLeagueId) setActiveLeagueId(savedLeagueId);
    }
  }, []);

  useEffect(() => {
    if (adminUnlocked && user) {
      initPage();
    }
  }, [adminUnlocked, user]);

  useEffect(() => {
    if (adminUnlocked && user) {
      loadRosters();
    }
  }, [activeLeagueId, currentRound, submittedOnly]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUser(user);
    setLoading(false);
  }

  async function initPage() {
    await Promise.all([loadAdminLeagues(), loadCurrentRound(), loadPlayers()]);
  }

  async function loadCurrentRound() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        if (settings.current_round) {
          setCurrentRound(settings.current_round);
        }
      }
    } catch (err) {
      console.error('Failed to load current round:', err);
    }
  }

  async function loadAdminLeagues() {
    if (!user) return;
    const { data } = await supabase
      .from('league_members')
      .select('league_id, role, leagues:league_id (id, name)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin']);

    const leagues = (data || [])
      .map(row => row.leagues)
      .filter(Boolean) as LeagueOption[];
    setAdminLeagues(leagues);

    if (typeof window === 'undefined') return;
    const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
    const savedValid = savedLeagueId && leagues.some((l) => l.id === savedLeagueId);
    if (savedValid) {
      setActiveLeagueId(savedLeagueId as string);
      return;
    }
    if (leagues[0]?.id) {
      window.localStorage.setItem(ACTIVE_LEAGUE_KEY, leagues[0].id);
      setActiveLeagueId(leagues[0].id);
    }
  }

  async function loadPlayers() {
    const { data } = await supabase
      .from('player_pool')
      .select('player_key, full_name, team, position');
    if (data) setPlayers(data as PlayerRow[]);
  }

  function showMessage(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  }

  async function handleAdminLogin() {
    setAuthError('');
    if (!password.trim()) {
      setAuthError('Enter the admin password.');
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (!res.ok) {
        setAuthError('Incorrect password.');
        return;
      }

      setAdminUnlocked(true);
      setAdminPassword(password.trim());
      setPassword('');
    } catch {
      setAuthError('Login failed. Try again.');
    }
  }

  async function loadRosters() {
    if (!activeLeagueId || activeLeagueId === DEFAULT_LEAGUE_ID) return;
    const pwd = adminPassword || prompt('Enter admin password to load rosters:');
    if (!pwd) {
      showMessage('Roster load cancelled.', 'info');
      return;
    }
    if (!adminPassword) setAdminPassword(pwd);

    const url = new URL('/api/admin/rosters', window.location.origin);
    url.searchParams.set('league_id', activeLeagueId);
    url.searchParams.set('round', currentRound);
    if (submittedOnly) url.searchParams.set('submitted', '1');

    const res = await fetch(url.toString(), {
      headers: { 'x-admin-password': pwd },
    });

    if (!res.ok) {
      showMessage('Failed to load rosters. Check password.', 'error');
      return;
    }

    const data = await res.json();
    setRosters((data.rosters || []) as AdminRoster[]);
  }

  function startEdit(roster: AdminRoster) {
    setEditingRosterId(roster.id);
    setEditRoster({
      qb_player_key: roster.qb_player_key || '',
      rb1_player_key: roster.rb1_player_key || '',
      rb2_player_key: roster.rb2_player_key || '',
      wr1_player_key: roster.wr1_player_key || '',
      wr2_player_key: roster.wr2_player_key || '',
      te_player_key: roster.te_player_key || '',
      k_player_key: roster.k_player_key || '',
      dst_player_key: roster.dst_player_key || '',
    });
  }

  function cancelEdit() {
    setEditingRosterId(null);
    setEditRoster({});
  }

  async function saveEdit(rosterId: string) {
    const pwd = adminPassword || prompt('Enter admin password to save changes:');
    if (!pwd) {
      showMessage('Save cancelled.', 'info');
      return;
    }
    if (!adminPassword) setAdminPassword(pwd);
    setSaving(true);

    const res = await fetch('/api/admin/rosters', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': pwd,
      },
      body: JSON.stringify({
        id: rosterId,
        roster: {
          qb_player_key: editRoster.qb_player_key || null,
          rb1_player_key: editRoster.rb1_player_key || null,
          rb2_player_key: editRoster.rb2_player_key || null,
          wr1_player_key: editRoster.wr1_player_key || null,
          wr2_player_key: editRoster.wr2_player_key || null,
          te_player_key: editRoster.te_player_key || null,
          k_player_key: editRoster.k_player_key || null,
          dst_player_key: editRoster.dst_player_key || null,
        },
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      showMessage(errorData?.error || 'Failed to update roster.', 'error');
      setSaving(false);
      return;
    }

    showMessage('Roster updated.', 'success');
    setSaving(false);
    cancelEdit();
    await loadRosters();
  }

  async function deleteRoster(rosterId: string) {
    if (!confirm('Delete this roster? This cannot be undone.')) return;
    const pwd = adminPassword || prompt('Enter admin password to delete roster:');
    if (!pwd) {
      showMessage('Delete cancelled.', 'info');
      return;
    }
    if (!adminPassword) setAdminPassword(pwd);

    const url = new URL('/api/admin/rosters', window.location.origin);
    url.searchParams.set('id', rosterId);

    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { 'x-admin-password': pwd },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      showMessage(errorData?.error || 'Failed to delete roster.', 'error');
      return;
    }

    showMessage('Roster deleted.', 'success');
    await loadRosters();
  }

  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerRow>();
    players.forEach(p => map.set(p.player_key, p));
    return map;
  }, [players]);

  const playersByPosition = useMemo(() => {
    const grouped: Record<string, PlayerRow[]> = {};
    players.forEach(p => {
      if (!grouped[p.position]) grouped[p.position] = [];
      grouped[p.position].push(p);
    });
    Object.values(grouped).forEach(list => {
      list.sort((a, b) => a.team.localeCompare(b.team) || a.full_name.localeCompare(b.full_name));
    });
    return grouped;
  }, [players]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!adminUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900">
        <NavBar />
        <div className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h1 className="text-xl font-bold text-white mb-2">Admin Login Required</h1>
            <p className="text-slate-400 text-sm mb-6">
              Enter the admin password to manage rosters.
            </p>
            <label className="block text-sm text-slate-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              placeholder="Admin password"
            />
            {authError && (
              <div className="mt-3 text-sm text-red-300">{authError}</div>
            )}
            <button
              onClick={handleAdminLogin}
              className="mt-5 w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition"
            >
              Unlock Rosters
            </button>
            <div className="mt-4 text-center">
              <Link href="/admin" className="text-slate-400 text-sm hover:text-white transition">
                Back to Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Roster Management</h1>
            <p className="text-slate-400 text-sm">View, edit, or delete submitted rosters.</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            Back to Admin
          </Link>
        </div>

        {message && (
          <div className={`p-4 rounded-xl border ${
            messageType === 'success' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-200' :
            messageType === 'error' ? 'bg-red-900/50 border-red-700 text-red-200' :
            'bg-slate-800 border-slate-700 text-slate-200'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">League</label>
              <select
                value={activeLeagueId}
                onChange={(e) => {
                  const next = e.target.value;
                  setActiveLeagueId(next);
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem(ACTIVE_LEAGUE_KEY, next);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                {adminLeagues.map((league) => (
                  <option key={league.id} value={league.id}>{league.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Round</label>
              <select
                value={currentRound}
                onChange={(e) => setCurrentRound(e.target.value as Round)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                {ROUNDS.map(r => (
                  <option key={r} value={r}>{r === 'WC' ? 'Wild Card' : r === 'DIV' ? 'Divisional' : r === 'CONF' ? 'Conference' : 'Super Bowl'}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => loadRosters()}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
              >
                Refresh
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={submittedOnly}
                onChange={(e) => setSubmittedOnly(e.target.checked)}
                className="accent-emerald-600"
              />
              Submitted only
            </label>
          </div>
        </div>

        {rosters.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-slate-400">
            No rosters found for this league and round.
          </div>
        ) : (
          <div className="space-y-4">
            {rosters.map((roster) => {
              const teamLabel = roster.team_name || roster.display_name || 'Unknown';
              return (
                <div key={roster.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="text-white font-semibold text-lg">{teamLabel}</div>
                      <div className="text-slate-400 text-sm">
                        Owner: {roster.display_name || 'Unknown'} • Submitted: {roster.submitted_at ? new Date(roster.submitted_at).toLocaleString() : 'Draft'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/leaderboard/roster/${roster.id}`}
                        className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 transition"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => startEdit(roster)}
                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRoster(roster.id)}
                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ROSTER_SLOTS.map((slot) => {
                      const playerKey = roster[slot.key as keyof AdminRoster] as string | null;
                      const player = playerKey ? playerMap.get(playerKey) : null;
                      return (
                        <div key={slot.key} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                          <div className="text-slate-400 text-xs">{slot.label}</div>
                          <div className="text-white text-sm font-medium">
                            {player ? `${player.full_name} (${player.team})` : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {editingRosterId === roster.id && (
                    <div className="mt-5 bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                      <div className="text-white font-semibold mb-3">Edit Roster</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ROSTER_SLOTS.map((slot) => (
                          <div key={slot.key}>
                            <label className="block text-xs text-slate-400 mb-1">{slot.label}</label>
                            <select
                              value={editRoster[slot.key] || ''}
                              onChange={(e) => setEditRoster((prev) => ({
                                ...prev,
                                [slot.key]: e.target.value,
                              }))}
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                            >
                              <option value="">— Empty —</option>
                              {(playersByPosition[slot.position] || []).map((player) => (
                                <option key={player.player_key} value={player.player_key}>
                                  {player.full_name} ({player.team})
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => saveEdit(roster.id)}
                          disabled={saving}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition"
                        >
                          Cancel
                        </button>
                        <label className="text-xs text-slate-400 flex items-center gap-2">
                          Changes update the roster immediately.
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
