'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  WILD_CARD_MATCHUPS,
  PROJECTED_POINTS,
  PLAYER_TIERS,
  getPlayerHeadshotUrl,
  getTeamLogoUrl,
  TEAM_COLORS
} from '@/lib/matchups';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const CURRENT_ROUND = 'WC';
const ACTIVE_LEAGUE_KEY = 'activeLeagueId';

interface Player {
  player_key: string;
  espn_id: string;
  full_name: string;
  team: string;
  position: string;
}

interface RosterSlot {
  key: string;
  label: string;
  shortLabel: string;
  position: string;
}

const ROSTER_SLOTS: RosterSlot[] = [
  { key: 'qb', label: 'Quarterback', shortLabel: 'QB', position: 'QB' },
  { key: 'rb1', label: 'Running Back 1', shortLabel: 'RB1', position: 'RB' },
  { key: 'rb2', label: 'Running Back 2', shortLabel: 'RB2', position: 'RB' },
  { key: 'wr1', label: 'Wide Receiver 1', shortLabel: 'WR1', position: 'WR' },
  { key: 'wr2', label: 'Wide Receiver 2', shortLabel: 'WR2', position: 'WR' },
  { key: 'te', label: 'Tight End', shortLabel: 'TE', position: 'TE' },
  { key: 'k', label: 'Kicker', shortLabel: 'K', position: 'K' },
  { key: 'dst', label: 'Defense/Special Teams', shortLabel: 'DST', position: 'DST' },
];

export default function RosterPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roster, setRoster] = useState<Record<string, string>>({
    qb: '', rb1: '', rb2: '', wr1: '', wr2: '', te: '', k: '', dst: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [showTier4, setShowTier4] = useState(true);
  const [activeLeagueId, setActiveLeagueId] = useState(DEFAULT_LEAGUE_ID);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (savedLeagueId) setActiveLeagueId(savedLeagueId);
    }
    checkUser();
    loadPlayers();
  }, []);

  useEffect(() => {
    loadRoster();
  }, [activeLeagueId]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUser(user);
  }

  async function loadPlayers() {
    const { data } = await supabase
      .from('player_pool')
      .select('*')
      .eq('is_active', true);

    if (data) setPlayers(data);
    setLoading(false);
  }

  async function loadRoster() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('rosters')
      .select('*')
      .eq('user_id', user.id)
      .eq('league_id', activeLeagueId)
      .eq('round', CURRENT_ROUND)
      .single();

    if (data) {
      setRoster({
        qb: data.qb_player_key || '',
        rb1: data.rb1_player_key || '',
        rb2: data.rb2_player_key || '',
        wr1: data.wr1_player_key || '',
        wr2: data.wr2_player_key || '',
        te: data.te_player_key || '',
        k: data.k_player_key || '',
        dst: data.dst_player_key || ''
      });
    }
  }

  async function saveRoster() {
    if (!user) return;
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('rosters')
        .upsert({
          user_id: user.id,
          league_id: activeLeagueId,
          round: CURRENT_ROUND,
          qb_player_key: roster.qb || null,
          rb1_player_key: roster.rb1 || null,
          rb2_player_key: roster.rb2 || null,
          wr1_player_key: roster.wr1 || null,
          wr2_player_key: roster.wr2 || null,
          te_player_key: roster.te || null,
          k_player_key: roster.k || null,
          dst_player_key: roster.dst || null,
          submitted_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,league_id,round'
        });

      if (error) throw error;
      setMessage('Roster saved successfully!');
      setTimeout(() => router.push('/leaderboard'), 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setMessage('Error: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const getPlayersByPosition = (position: string) => {
    return players
      .filter(p => p.position === position)
      .sort((a, b) => {
        const tierA = PLAYER_TIERS[a.player_key] || 4;
        const tierB = PLAYER_TIERS[b.player_key] || 4;
        if (tierA !== tierB) return tierA - tierB;
        const projA = PROJECTED_POINTS[a.player_key] || 0;
        const projB = PROJECTED_POINTS[b.player_key] || 0;
        return projB - projA;
      });
  };

  const getSelectedPlayer = (playerKey: string) => {
    return players.find(p => p.player_key === playerKey);
  };

  const isPlayerSelected = (playerKey: string) => {
    return Object.values(roster).includes(playerKey);
  };

  const selectPlayer = (slotKey: string, playerKey: string) => {
    setRoster({ ...roster, [slotKey]: playerKey });
    setActiveSlot(null);
  };

  const clearSlot = (slotKey: string) => {
    setRoster({ ...roster, [slotKey]: '' });
  };

  const getTotalProjectedPoints = () => {
    return Object.values(roster).reduce((total, playerKey) => {
      return total + (PROJECTED_POINTS[playerKey] || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🏈</span>
              <div>
                <h1 className="text-xl font-bold text-white">NFL Playoff Challenge</h1>
                <p className="text-slate-400 text-sm">Wild Card Round</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-slate-400 text-sm">Projected Points</div>
                <div className="text-2xl font-bold text-emerald-400">{getTotalProjectedPoints().toFixed(1)}</div>
              </div>
              <Link
                href="/leaderboard"
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Leaderboard
              </Link>
              <Link
                href="/league"
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                League
              </Link>
              <Link
                href="/admin"
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Admin
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-xl">
          <p className="text-blue-200 text-sm">
            <strong>Pick your 8-player roster!</strong> Click a slot below, then select a player.
            Players on bye (DEN, SEA) will score in the Divisional Round. Keep players across rounds to earn multipliers!
          </p>
        </div>

        {/* My Roster Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">My Roster</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {ROSTER_SLOTS.map((slot) => {
              const selectedPlayer = roster[slot.key] ? getSelectedPlayer(roster[slot.key]) : null;
              const matchup = selectedPlayer ? WILD_CARD_MATCHUPS[selectedPlayer.team] : null;
              const projected = roster[slot.key] ? PROJECTED_POINTS[roster[slot.key]] : null;
              const teamColors = selectedPlayer ? TEAM_COLORS[selectedPlayer.team] : null;

              return (
                <div
                  key={slot.key}
                  onClick={() => setActiveSlot(activeSlot === slot.key ? null : slot.key)}
                  className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                    activeSlot === slot.key
                      ? 'ring-2 ring-blue-500 scale-105'
                      : 'hover:scale-102 hover:shadow-lg'
                  } ${selectedPlayer ? '' : 'border-2 border-dashed border-slate-600'}`}
                  style={selectedPlayer && teamColors ? {
                    background: `linear-gradient(135deg, ${teamColors.primary} 0%, ${teamColors.secondary} 100%)`
                  } : { background: '#1e293b' }}
                >
                  {/* Position Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 rounded text-xs font-bold text-white">
                    {slot.shortLabel}
                  </div>

                  {/* Clear Button */}
                  {selectedPlayer && (
                    <button
                      onClick={(e) => { e.stopPropagation(); clearSlot(slot.key); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs transition"
                    >
                      ✕
                    </button>
                  )}

                  {selectedPlayer ? (
                    <div className="pt-8 pb-3 px-2">
                      {/* Player Image */}
                      <div className="flex justify-center mb-2">
                        <img
                          src={selectedPlayer.position === 'DST'
                            ? getTeamLogoUrl(selectedPlayer.team)
                            : getPlayerHeadshotUrl(selectedPlayer.espn_id)}
                          alt={selectedPlayer.full_name}
                          className="w-16 h-16 rounded-full bg-white/20 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getTeamLogoUrl(selectedPlayer.team);
                          }}
                        />
                      </div>
                      {/* Player Name */}
                      <div className="text-center">
                        <div className="text-white font-bold text-sm truncate">
                          {selectedPlayer.position === 'DST'
                            ? selectedPlayer.team
                            : selectedPlayer.full_name.split(' ').pop()}
                        </div>
                        <div className="text-white/70 text-xs">
                          {selectedPlayer.team}
                        </div>
                      </div>
                      {/* Matchup */}
                      {matchup && (
                        <div className="mt-2 text-center">
                          <div className={`text-xs font-medium ${matchup.isBye ? 'text-yellow-300' : 'text-white/80'}`}>
                            {matchup.isBye ? 'BYE' : `${matchup.isHome ? 'vs' : '@'} ${matchup.opponent}`}
                          </div>
                        </div>
                      )}
                      {/* Projected Points */}
                      {projected !== null && (
                        <div className="mt-1 text-center">
                          <span className="inline-block px-2 py-0.5 bg-black/30 rounded text-emerald-300 text-xs font-bold">
                            {projected.toFixed(1)} pts
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 px-2 text-center">
                      <div className="text-slate-500 text-4xl mb-2">+</div>
                      <div className="text-slate-500 text-sm">Tap to add</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Selection Panel */}
        {activeSlot && (
          <div className="mb-8 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                Select {ROSTER_SLOTS.find(s => s.key === activeSlot)?.label}
              </h3>
              <button
                onClick={() => setActiveSlot(null)}
                className="text-slate-400 hover:text-white transition"
              >
                Close ✕
              </button>
            </div>

            {/* Tier Toggle for deep bench */}
            <div className="mb-4 flex items-center gap-2">
              <label className="text-slate-400 text-sm">Show all players:</label>
              <button
                onClick={() => setShowTier4(!showTier4)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  showTier4 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {showTier4 ? 'Yes' : 'No'}
              </button>
            </div>

            {/* Player Grid */}
            <div className="space-y-6">
              {[1, 2, 3, ...(showTier4 ? [4] : [])].map(tier => {
                const tierPlayers = getPlayersByPosition(
                  ROSTER_SLOTS.find(s => s.key === activeSlot)?.position || ''
                ).filter(p => (PLAYER_TIERS[p.player_key] || 4) === tier);

                if (tierPlayers.length === 0) return null;

                const tierLabels: Record<number, string> = {
                  1: 'Starters',
                  2: 'Key Contributors',
                  3: 'Depth / Flex Options',
                  4: 'Deep Bench'
                };

                return (
                  <div key={tier}>
                    <div className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        tier === 1 ? 'bg-emerald-500' :
                        tier === 2 ? 'bg-blue-500' :
                        tier === 3 ? 'bg-yellow-500' : 'bg-slate-500'
                      }`}></span>
                      {tierLabels[tier]}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {tierPlayers.map(player => {
                        const matchup = WILD_CARD_MATCHUPS[player.team];
                        const projected = PROJECTED_POINTS[player.player_key];
                        const isSelected = isPlayerSelected(player.player_key);
                        const teamColors = TEAM_COLORS[player.team];

                        return (
                          <div
                            key={player.player_key}
                            onClick={() => !isSelected && selectPlayer(activeSlot, player.player_key)}
                            className={`rounded-xl overflow-hidden transition-all duration-200 ${
                              isSelected
                                ? 'opacity-40 cursor-not-allowed'
                                : 'cursor-pointer hover:scale-105 hover:shadow-lg'
                            }`}
                            style={{
                              background: `linear-gradient(135deg, ${teamColors?.primary || '#334155'} 0%, ${teamColors?.secondary || '#1e293b'} 100%)`
                            }}
                          >
                            <div className="p-3">
                              {/* Player Image */}
                              <div className="flex justify-center mb-2">
                                <img
                                  src={player.position === 'DST'
                                    ? getTeamLogoUrl(player.team)
                                    : getPlayerHeadshotUrl(player.espn_id)}
                                  alt={player.full_name}
                                  className="w-14 h-14 rounded-full bg-white/20 object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getTeamLogoUrl(player.team);
                                  }}
                                />
                              </div>
                              {/* Player Info */}
                              <div className="text-center">
                                <div className="text-white font-bold text-sm truncate">
                                  {player.position === 'DST' ? player.team : player.full_name}
                                </div>
                                <div className="text-white/70 text-xs">
                                  {player.team} • {player.position}
                                </div>
                              </div>
                              {/* Matchup */}
                              {matchup && (
                                <div className="mt-2 text-center">
                                  <div className={`text-xs ${matchup.isBye ? 'text-yellow-300 font-medium' : 'text-white/70'}`}>
                                    {matchup.isBye ? '🟡 BYE (Div Rd)' : `${matchup.isHome ? 'vs' : '@'} ${matchup.opponent}`}
                                  </div>
                                  {!matchup.isBye && (
                                    <div className="text-white/50 text-xs">
                                      {matchup.date}
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Projected Points */}
                              {projected !== undefined && (
                                <div className="mt-2 text-center">
                                  <span className="inline-block px-2 py-1 bg-black/30 rounded-full text-emerald-300 text-xs font-bold">
                                    {projected.toFixed(1)} proj
                                  </span>
                                </div>
                              )}
                              {/* Selected Badge */}
                              {isSelected && (
                                <div className="mt-2 text-center">
                                  <span className="text-white/80 text-xs">Already selected</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-xl ${
            message.includes('Error')
              ? 'bg-red-900/50 border border-red-700 text-red-200'
              : 'bg-emerald-900/50 border border-emerald-700 text-emerald-200'
          }`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={saveRoster}
            disabled={saving}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition disabled:opacity-50 shadow-lg"
          >
            {saving ? 'Saving...' : 'Save Roster'}
          </button>
          <Link
            href="/leaderboard"
            className="px-8 py-4 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition text-center"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
