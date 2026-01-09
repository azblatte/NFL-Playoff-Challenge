'use client';

import { useEffect, useState } from 'react';
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

type LeagueRow = {
  id: string;
  name: string;
  join_code: string | null;
  scoring_format: 'PPR' | 'HALF_PPR' | 'STANDARD';
  owner_user_id: string | null;
  scoring_settings: Record<string, unknown> | null;
};

type AdminLeagueRow = {
  league_id: string;
  role: 'owner' | 'admin' | 'member';
  leagues: LeagueRow | null;
};

type LeagueSummary = {
  league_id: string;
  role: 'owner' | 'admin';
  league: LeagueRow;
  rosterCount: number;
  memberCount: number;
};

export default function AdminPage() {
  const router = useRouter();
  const { adminUnlocked, adminPassword, setAdminUnlocked, setAdminPassword, clearAdminSession } = useAdminSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [summaries, setSummaries] = useState<LeagueSummary[]>([]);
  const [counts, setCounts] = useState({ leagues: 0, rosters: 0, players: 0 });
  const [activeLeagueId, setActiveLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [currentRound, setCurrentRound] = useState<Round>('WC');
  const [processing, setProcessing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkUser();
    if (typeof window !== 'undefined') {
      const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (savedLeagueId) setActiveLeagueId(savedLeagueId);
    }
  }, []);

  useEffect(() => {
    if (adminUnlocked && user) {
      initData();
    }
  }, [adminUnlocked, user]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUser(user);
    setLoading(false);
  }

  async function initData() {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadSummaries(user.id), loadCounts()]);
    setLoading(false);
  }

  async function loadCounts() {
    const [{ count: leaguesCount }, { count: rostersCount }, { count: playersCount }] = await Promise.all([
      supabase.from('leagues').select('id', { count: 'exact', head: true }),
      supabase.from('rosters').select('id', { count: 'exact', head: true }),
      supabase.from('player_pool').select('player_key', { count: 'exact', head: true }),
    ]);

    setCounts({
      leagues: leaguesCount || 0,
      rosters: rostersCount || 0,
      players: playersCount || 0,
    });
  }

  async function loadSummaries(userId: string) {
    const { data, error } = await supabase
      .from('league_members')
      .select('league_id, role, leagues:league_id (id, name, join_code, scoring_format, owner_user_id, scoring_settings)')
      .eq('user_id', userId)
      .in('role', ['owner', 'admin']);

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    const rows = (data || []) as unknown as AdminLeagueRow[];
    const newSummaries: LeagueSummary[] = [];

    for (const row of rows) {
      if (!row.leagues) continue;
      const leagueId = row.league_id;
      const [memberResult, rosterResult] = await Promise.all([
        supabase.from('league_members').select('id', { count: 'exact', head: true }).eq('league_id', leagueId),
        supabase.from('rosters').select('id', { count: 'exact', head: true }).eq('league_id', leagueId),
      ]);

      newSummaries.push({
        league_id: leagueId,
        role: row.role === 'admin' ? 'admin' : 'owner',
        league: row.leagues,
        memberCount: memberResult.count || 0,
        rosterCount: rosterResult.count || 0,
      });
    }

    setSummaries(newSummaries);
  }

  function showMessage(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  }

  function handleSetActiveLeague(leagueId: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_LEAGUE_KEY, leagueId);
    }
    setActiveLeagueId(leagueId);
    showMessage('Active league updated.', 'success');
  }

  async function handleCopyJoinCode(code: string | null) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showMessage('Join code copied.', 'success');
    } catch {
      showMessage(`Join code: ${code}`, 'info');
    }
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

  function handleAdminLogout() {
    clearAdminSession();
    setMessage('');
    setAuthError('');
  }

  async function handleDownloadBackup() {
    setProcessing(true);
    try {
      const leagueParam = activeLeagueId !== DEFAULT_LEAGUE_ID ? `league_id=${activeLeagueId}&` : '';
      const res = await fetch(`/api/admin/backup?${leagueParam}round=${currentRound}`, {
        headers: {
          'x-admin-password': adminPassword,
        },
      });

      if (!res.ok) {
        // Try with stored password
        const storedPwd = prompt('Enter admin password for backup:');
        if (!storedPwd) {
          showMessage('Backup cancelled.', 'info');
          setProcessing(false);
          return;
        }

        const res2 = await fetch(`/api/admin/backup?${leagueParam}round=${currentRound}`, {
          headers: { 'x-admin-password': storedPwd },
        });

        if (!res2.ok) {
          showMessage('Failed to download backup. Check password.', 'error');
          setProcessing(false);
          return;
        }

        setAdminPassword(storedPwd);
        const blob = await res2.blob();
        downloadBlob(blob);
      } else {
        const blob = await res.blob();
        downloadBlob(blob);
      }
    } catch (err) {
      showMessage('Failed to download backup.', 'error');
    }
    setProcessing(false);
  }

  async function handleManualSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/sync-scores?round=${currentRound}`, {
        headers: {
          'x-admin-password': adminPassword,
        },
      });

      if (!res.ok) {
        const storedPwd = prompt('Enter admin password to sync scores:');
        if (!storedPwd) {
          showMessage('Sync cancelled.', 'info');
          setSyncing(false);
          return;
        }

        const res2 = await fetch(`/api/admin/sync-scores?round=${currentRound}`, {
          headers: { 'x-admin-password': storedPwd },
        });

        if (!res2.ok) {
          const errorData = await res2.json().catch(() => null);
          showMessage(errorData?.error || 'Failed to sync scores. Check password.', 'error');
          setSyncing(false);
          return;
        }

        const data = await res2.json();
        setAdminPassword(storedPwd);
        showMessage(`Sync complete: ${data.gamesProcessed} games, ${data.playersUpdated} players.`, 'success');
        setSyncing(false);
        return;
      }

      const data = await res.json();
      showMessage(`Sync complete: ${data.gamesProcessed} games, ${data.playersUpdated} players.`, 'success');
    } catch (err) {
      showMessage('Failed to sync scores.', 'error');
    }
    setSyncing(false);
  }

  async function handleDeleteLeague(leagueId: string) {
    if (!user) return;
    const confirmed = window.confirm('Delete this league? This removes all rosters and members.');
    if (!confirmed) return;
    setProcessing(true);

    const { error } = await supabase
      .from('leagues')
      .delete()
      .eq('id', leagueId);

    if (error) {
      showMessage(error.message, 'error');
      setProcessing(false);
      return;
    }

    await Promise.all([loadSummaries(user.id), loadCounts()]);
    showMessage('League deleted.', 'success');
    setProcessing(false);
  }

  function downloadBlob(blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rosters-backup-${currentRound}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    showMessage('Backup downloaded successfully!', 'success');
  }

  async function handleAdvanceRound() {
    const currentIndex = ROUNDS.indexOf(currentRound);
    if (currentIndex >= ROUNDS.length - 1) {
      showMessage('Already at Super Bowl. Cannot advance further.', 'error');
      return;
    }

    const nextRound = ROUNDS[currentIndex + 1];
    const confirm = window.confirm(
      `Advance from ${currentRound} to ${nextRound}?\n\nThis will:\n1. Copy all rosters to the next round\n2. Increment multipliers for kept players\n3. Reset multipliers for dropped players\n\nThis action cannot be undone!`
    );

    if (!confirm) return;

    setProcessing(true);
    try {
      // Get all rosters for current round in the active league
      const { data: currentRosters, error: fetchError } = await supabase
        .from('rosters')
        .select('*')
        .eq('league_id', activeLeagueId)
        .eq('round', currentRound);

      if (fetchError) throw fetchError;

      if (!currentRosters || currentRosters.length === 0) {
        showMessage('No rosters found for current round.', 'error');
        setProcessing(false);
        return;
      }

      // Create new rosters for next round with incremented multipliers
      const newRosters = currentRosters.map(r => ({
        user_id: r.user_id,
        league_id: r.league_id,
        round: nextRound,
        qb_player_key: r.qb_player_key,
        qb_weeks_held: r.qb_player_key ? Math.min(r.qb_weeks_held + 1, 4) : 1,
        rb1_player_key: r.rb1_player_key,
        rb1_weeks_held: r.rb1_player_key ? Math.min(r.rb1_weeks_held + 1, 4) : 1,
        rb2_player_key: r.rb2_player_key,
        rb2_weeks_held: r.rb2_player_key ? Math.min(r.rb2_weeks_held + 1, 4) : 1,
        wr1_player_key: r.wr1_player_key,
        wr1_weeks_held: r.wr1_player_key ? Math.min(r.wr1_weeks_held + 1, 4) : 1,
        wr2_player_key: r.wr2_player_key,
        wr2_weeks_held: r.wr2_player_key ? Math.min(r.wr2_weeks_held + 1, 4) : 1,
        te_player_key: r.te_player_key,
        te_weeks_held: r.te_player_key ? Math.min(r.te_weeks_held + 1, 4) : 1,
        k_player_key: r.k_player_key,
        k_weeks_held: r.k_player_key ? Math.min(r.k_weeks_held + 1, 4) : 1,
        dst_player_key: r.dst_player_key,
        dst_weeks_held: r.dst_player_key ? Math.min(r.dst_weeks_held + 1, 4) : 1,
        submitted_at: null,
        is_final: false,
      }));

      // Insert new rosters (using upsert to handle any that might exist)
      const { error: insertError } = await supabase
        .from('rosters')
        .upsert(newRosters, { onConflict: 'user_id,league_id,round' });

      if (insertError) throw insertError;

      setCurrentRound(nextRound);
      showMessage(`Advanced to ${nextRound}! ${newRosters.length} rosters copied with updated multipliers.`, 'success');
      await loadCounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showMessage(`Failed to advance round: ${message}`, 'error');
    }
    setProcessing(false);
  }

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
            <h1 className="text-xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-slate-400 text-sm mb-6">
              Enter the admin password to access management tools.
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
              Unlock Admin
            </button>
            <div className="mt-4 text-center">
              <Link href="/league" className="text-slate-400 text-sm hover:text-white transition">
                Back to League Hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeLeagueSummary = summaries.find(s => s.league_id === activeLeagueId);
  const isBusy = processing || syncing;

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl border ${
            messageType === 'success' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-200' :
            messageType === 'error' ? 'bg-red-900/50 border-red-700 text-red-200' :
            'bg-slate-800 border-slate-700 text-slate-200'
          }`}>
            {message}
          </div>
        )}

        {/* Stats Overview */}
        <div className="text-slate-400 text-sm">Global totals across all leagues.</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-400 text-sm">Total Leagues</div>
            <div className="text-2xl font-bold text-white">{counts.leagues}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-400 text-sm">Total Rosters</div>
            <div className="text-2xl font-bold text-white">{counts.rosters}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-400 text-sm">Player Pool</div>
            <div className="text-2xl font-bold text-white">{counts.players}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-slate-400 text-sm">Current Round</div>
            <div className="text-2xl font-bold text-emerald-400">{currentRound}</div>
          </div>
        </div>

        {/* Round Controls */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Round Management</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Select Round</label>
              <select
                value={currentRound}
                onChange={(e) => setCurrentRound(e.target.value as Round)}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                {ROUNDS.map(r => (
                  <option key={r} value={r}>{r === 'WC' ? 'Wild Card' : r === 'DIV' ? 'Divisional' : r === 'CONF' ? 'Conference' : 'Super Bowl'}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 sm:mt-6">
              <button
                onClick={handleAdvanceRound}
                disabled={isBusy || currentRound === 'SB'}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Advance Round'}
              </button>
              <button
                onClick={handleDownloadBackup}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition disabled:opacity-50"
              >
                {processing ? 'Downloading...' : 'Download Backup CSV'}
              </button>
              <button
                onClick={handleManualSync}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-500 transition disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync Scores Now'}
              </button>
              <Link
                href="/admin/rosters"
                className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition"
              >
                Manage Rosters
              </Link>
            </div>
          </div>
          <p className="mt-4 text-slate-400 text-sm">
            Advancing rounds will copy all rosters to the next round and increment multipliers for players that are kept.
            Download a backup before advancing to save current state.
          </p>
        </div>

        {/* Your Admin Leagues */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Your Admin Leagues</h2>
          {summaries.length === 0 ? (
            <div className="text-slate-400">No admin access yet. Create a league to become owner.</div>
          ) : (
            <div className="space-y-4">
              {summaries.map((summary) => {
                const isActive = summary.league_id === activeLeagueId;
                return (
                  <div key={summary.league_id} className={`p-4 rounded-lg border ${isActive ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 bg-slate-900/40'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="text-white font-semibold flex items-center gap-2">
                          {summary.league.name}
                          {isActive && <span className="text-xs bg-emerald-600 px-2 py-0.5 rounded">Active</span>}
                        </div>
                        <div className="text-slate-400 text-sm">Role: {summary.role.toUpperCase()}</div>
                        <div className="text-slate-400 text-sm">Join code: {summary.league.join_code || 'N/A'}</div>
                        <div className="text-slate-400 text-sm">Scoring: {summary.league.scoring_format}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm">
                          {summary.memberCount} members
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm">
                          {summary.rosterCount} rosters
                        </div>
                        <button
                          onClick={() => handleSetActiveLeague(summary.league_id)}
                          disabled={isActive}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${isActive ? 'bg-emerald-600 text-white cursor-default' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                        >
                          {isActive ? 'Active' : 'Set Active'}
                        </button>
                        <button
                          onClick={() => handleCopyJoinCode(summary.league.join_code)}
                          className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 transition"
                        >
                          Copy Code
                        </button>
                        {summary.role === 'owner' && (
                          <button
                            onClick={() => handleDeleteLeague(summary.league_id)}
                            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 transition"
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

        {/* Active League Details */}
        {activeLeagueSummary && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">Active League: {activeLeagueSummary.league.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-sm">Members</div>
                <div className="text-xl font-bold text-white">{activeLeagueSummary.memberCount}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-sm">Rosters</div>
                <div className="text-xl font-bold text-white">{activeLeagueSummary.rosterCount}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-sm">Scoring</div>
                <div className="text-xl font-bold text-white">{activeLeagueSummary.league.scoring_format}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-sm">Join Code</div>
                <div className="text-xl font-bold text-emerald-400">{activeLeagueSummary.league.join_code}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/settings"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition"
              >
                Edit Scoring Settings
              </Link>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-3">Admin Guide</h2>
          <div className="text-slate-300 text-sm space-y-2">
            <div><strong>Download Backup:</strong> Export all rosters to CSV for Google Sheets backup.</div>
            <div><strong>Advance Round:</strong> Copy rosters to next round with incremented multipliers (1x → 2x → 3x → 4x).</div>
            <div><strong>Sync Scores:</strong> Manually pull the latest ESPN stats for the selected round.</div>
            <div><strong>Scoring Settings:</strong> Adjust full scoring rules in Admin → Scoring Settings.</div>
            <div><strong>Manage Rosters:</strong> View, edit, or delete submitted rosters for the active league.</div>
            <div><strong>Member Management:</strong> Add/remove members in League Hub.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
