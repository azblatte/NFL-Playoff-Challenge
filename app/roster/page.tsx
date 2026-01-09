'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import MultiplierBadge, { MultiplierRing } from '@/components/MultiplierBadge';
import {
  WILD_CARD_MATCHUPS,
  PROJECTED_POINTS,
  PLAYER_TIERS,
  getPlayerHeadshotUrl,
  getTeamLogoUrl,
  TEAM_COLORS
} from '@/lib/matchups';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const ACTIVE_LEAGUE_KEY = 'activeLeagueId';

const ROUND_NAMES: Record<string, string> = {
  WC: 'Wild Card',
  DIV: 'Divisional',
  CONF: 'Conference',
  SB: 'Super Bowl',
};

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
  const [weeksHeld, setWeeksHeld] = useState<Record<string, number>>({
    qb: 1, rb1: 1, rb2: 1, wr1: 1, wr2: 1, te: 1, k: 1, dst: 1
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [showTier4, setShowTier4] = useState(true);
  const [activeLeagueId, setActiveLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [currentRound, setCurrentRound] = useState('WC');
  const playerPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (savedLeagueId) setActiveLeagueId(savedLeagueId);
    }
    loadCurrentRound();
    checkUser();
    loadPlayers();
  }, []);

  useEffect(() => {
    if (currentRound) {
      loadRoster();
    }
  }, [activeLeagueId, currentRound]);

  useEffect(() => {
    if (!activeSlot || typeof window === 'undefined') return;
    if (window.innerWidth >= 768) return;
    const panel = playerPanelRef.current;
    if (!panel) return;
    requestAnimationFrame(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeSlot]);

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
      .eq('round', currentRound)
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
      setWeeksHeld({
        qb: data.qb_weeks_held || 1,
        rb1: data.rb1_weeks_held || 1,
        rb2: data.rb2_weeks_held || 1,
        wr1: data.wr1_weeks_held || 1,
        wr2: data.wr2_weeks_held || 1,
        te: data.te_weeks_held || 1,
        k: data.k_weeks_held || 1,
        dst: data.dst_weeks_held || 1
      });
    }
  }

  async function saveRoster() {
    if (!user) return;
    setSaving(true);
    setMessage('');

    // Get current roster to check for player changes
    const { data: existingRoster } = await supabase
      .from('rosters')
      .select('*')
      .eq('user_id', user.id)
      .eq('league_id', activeLeagueId)
      .eq('round', currentRound)
      .single();

    // Calculate weeks_held for each slot
    // If player changed, reset to 1. If same player, keep existing weeks_held
    const calcWeeksHeld = (slotKey: string, playerKey: string | null) => {
      if (!playerKey) return 1;
      if (!existingRoster) return 1;
      const existingKey = existingRoster[`${slotKey}_player_key`];
      const existingWeeks = existingRoster[`${slotKey}_weeks_held`] || 1;
      // If same player, keep their weeks_held (will be incremented on round advance)
      return existingKey === playerKey ? existingWeeks : 1;
    };

    try {
      const { error } = await supabase
        .from('rosters')
        .upsert({
          user_id: user.id,
          league_id: activeLeagueId,
          round: currentRound,
          qb_player_key: roster.qb || null,
          qb_weeks_held: calcWeeksHeld('qb', roster.qb || null),
          rb1_player_key: roster.rb1 || null,
          rb1_weeks_held: calcWeeksHeld('rb1', roster.rb1 || null),
          rb2_player_key: roster.rb2 || null,
          rb2_weeks_held: calcWeeksHeld('rb2', roster.rb2 || null),
          wr1_player_key: roster.wr1 || null,
          wr1_weeks_held: calcWeeksHeld('wr1', roster.wr1 || null),
          wr2_player_key: roster.wr2 || null,
          wr2_weeks_held: calcWeeksHeld('wr2', roster.wr2 || null),
          te_player_key: roster.te || null,
          te_weeks_held: calcWeeksHeld('te', roster.te || null),
          k_player_key: roster.k || null,
          k_weeks_held: calcWeeksHeld('k', roster.k || null),
          dst_player_key: roster.dst || null,
          dst_weeks_held: calcWeeksHeld('dst', roster.dst || null),
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
    // New player = reset weeks to 1
    setWeeksHeld({ ...weeksHeld, [slotKey]: 1 });
    setActiveSlot(null);
  };

  const toggleSlot = (slotKey: string) => {
    setActiveSlot(prev => (prev === slotKey ? null : slotKey));
  };

  const clearSlot = (slotKey: string) => {
    setRoster({ ...roster, [slotKey]: '' });
    setWeeksHeld({ ...weeksHeld, [slotKey]: 1 });
  };

  const getTotalProjectedPoints = () => {
    return Object.entries(roster).reduce((total, [slotKey, playerKey]) => {
      const basePoints = PROJECTED_POINTS[playerKey] || 0;
      const multiplier = weeksHeld[slotKey] || 1;
      return total + (basePoints * multiplier);
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
      <NavBar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Roster</h1>
            <p className="text-slate-400 text-sm">{ROUND_NAMES[currentRound] || currentRound} Round</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-right">
              <div className="text-slate-400 text-sm">Projected Points</div>
              <div className="text-2xl font-bold text-emerald-400">{getTotalProjectedPoints().toFixed(1)}</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition"
            >
              Log Out
            </button>
          </div>
        </div>
        {/* Multiplier Legend */}
        <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-white font-medium mb-1">Loyalty Multipliers</p>
              <p className="text-slate-400 text-sm">Keep players across rounds to earn bonus multipliers on their points!</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 text-xs font-bold">2x</span>
                <span className="text-slate-400">Week 2</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center text-purple-400 text-xs font-bold">3x</span>
                <span className="text-slate-400">Week 3</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center text-amber-400 text-xs font-bold animate-pulse">4x</span>
                <span className="text-slate-400">Week 4 (Max)</span>
              </div>
            </div>
          </div>
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
              const multiplier = weeksHeld[slot.key] || 1;

              return (
                <div
                  key={slot.key}
                  onClick={() => toggleSlot(slot.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSlot(slot.key);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={activeSlot === slot.key}
                  aria-label={`Select ${slot.label}`}
                  className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 touch-manipulation ${
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

                  {/* Multiplier Ring - Enhanced Visual */}
                  {selectedPlayer && <MultiplierRing multiplier={multiplier} />}

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
                      {/* Projected Points with Multiplier */}
                      {projected !== null && (
                        <div className="mt-1 text-center">
                          <span className="inline-block px-2 py-0.5 bg-black/30 rounded text-emerald-300 text-xs font-bold">
                            {multiplier > 1 ? (
                              <>{projected.toFixed(1)} × {multiplier} = {(projected * multiplier).toFixed(1)}</>
                            ) : (
                              <>{(projected * multiplier).toFixed(1)} pts</>
                            )}
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
          <div ref={playerPanelRef} className="mb-8 bg-slate-800 rounded-xl p-4 border border-slate-700">
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
