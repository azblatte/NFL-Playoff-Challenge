'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  calculateFantasyPointsWithSettings,
  normalizeScoringSettings,
  type PlayerStats,
  type ScoringSettings,
} from '@/lib/scoring';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const ACTIVE_LEAGUE_KEY = 'activeLeagueId';

const ROUND_NAMES: Record<string, string> = {
  WC: 'Wild Card',
  DIV: 'Divisional',
  CONF: 'Conference',
  SB: 'Super Bowl',
};

type LeaderboardEntry = {
  teamName: string;
  displayName: string;
  points: number;
  userId: string;
  rosterId: string;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeagueId, setActiveLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [leagueName, setLeagueName] = useState('');
  const [leagueSettings, setLeagueSettings] = useState<ScoringSettings | null>(null);
  const [currentRound, setCurrentRound] = useState('WC');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (savedLeagueId) setActiveLeagueId(savedLeagueId);
    }
    loadCurrentRound();
  }, []);

  useEffect(() => {
    if (currentRound) {
      loadLeaderboard();
      const interval = setInterval(loadLeaderboard, 30000);
      return () => clearInterval(interval);
    }
  }, [activeLeagueId, currentRound]);

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

  async function loadLeaderboard() {
    try {
      // Get league info
      const { data: league } = await supabase
        .from('leagues')
        .select('name, scoring_format, scoring_settings')
        .eq('id', activeLeagueId)
        .single();

      let scoring = normalizeScoringSettings('PPR', undefined);
      if (league) {
        setLeagueName(league.name);
        scoring = normalizeScoringSettings(
          league.scoring_format || 'PPR',
          (league.scoring_settings as Partial<ScoringSettings> | null) || undefined
        );
      }
      setLeagueSettings(scoring);

      // Get all rosters for this round
      const { data: rosters } = await supabase
        .from('rosters')
        .select('*, profiles:user_id (display_name)')
        .eq('league_id', activeLeagueId)
        .eq('round', currentRound);

      if (!rosters) return;

      // Get member team names
      const { data: members } = await supabase
        .from('league_members')
        .select('user_id, team_name')
        .eq('league_id', activeLeagueId);

      const teamNameMap = new Map<string, string>();
      members?.forEach(m => {
        if (m.team_name) teamNameMap.set(m.user_id, m.team_name);
      });

      // Get all player scores
      const { data: scores } = await supabase
        .from('player_scores')
        .select('player_key, points, stats')
        .eq('round', currentRound);

      const scoreMap = new Map(scores?.map(s => [s.player_key, s]) || []);

      // Calculate totals
      const results: LeaderboardEntry[] = rosters.map(r => {
        const positions = [
          { key: r.qb_player_key, mult: r.qb_weeks_held },
          { key: r.rb1_player_key, mult: r.rb1_weeks_held },
          { key: r.rb2_player_key, mult: r.rb2_weeks_held },
          { key: r.wr1_player_key, mult: r.wr1_weeks_held },
          { key: r.wr2_player_key, mult: r.wr2_weeks_held },
          { key: r.te_player_key, mult: r.te_weeks_held },
          { key: r.k_player_key, mult: r.k_weeks_held },
          { key: r.dst_player_key, mult: r.dst_weeks_held },
        ];

        const total = positions.reduce((sum, p) => {
          if (!p.key) return sum;
          const scoreRow = scoreMap.get(p.key);
          const base = scoreRow?.stats
            ? calculateFantasyPointsWithSettings(scoreRow.stats as PlayerStats, scoring)
            : (scoreRow?.points || 0);
          return sum + (base * p.mult);
        }, 0);

        const displayName = r.profiles?.display_name || 'Unknown';
        const teamName = teamNameMap.get(r.user_id) || displayName;

        return {
          teamName,
          displayName,
          points: Math.round(total * 100) / 100,
          userId: r.user_id,
          rosterId: r.id,
        };
      });

      results.sort((a, b) => b.points - a.points);
      setLeaderboard(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-600 to-amber-500 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-slate-400 to-slate-300 text-slate-900';
    if (rank === 3) return 'bg-gradient-to-r from-amber-700 to-amber-600 text-white';
    return 'bg-slate-700 text-white';
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="text-xl font-bold text-white">Leaderboard</h1>
              <p className="text-slate-400 text-sm">{leagueName || 'Loading...'} - {ROUND_NAMES[currentRound] || currentRound}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/roster"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
              Roster
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
              onClick={() => loadLeaderboard()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-white text-xl">Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
            <div className="text-slate-400 text-lg">No rosters submitted yet.</div>
            <Link href="/roster" className="mt-4 inline-block px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition">
              Submit Your Roster
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, i) => {
              const rank = i + 1;
              return (
                <Link
                  key={entry.rosterId}
                  href={`/leaderboard/roster/${entry.rosterId}`}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4 hover:bg-slate-750 transition"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRankStyle(rank)}`}>
                    {rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-lg truncate">
                      {entry.teamName}
                    </div>
                    <div className="text-slate-400 text-sm truncate">
                      {entry.displayName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-400">
                      {entry.points.toFixed(1)}
                    </div>
                    <div className="text-slate-400 text-xs">points</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-3">Scoring Key</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Passing TD</div>
              <div className="text-white font-medium">{leagueSettings?.passing.touchdown ?? 4} pts</div>
            </div>
            <div>
              <div className="text-slate-400">Rush/Rec TD</div>
              <div className="text-white font-medium">{leagueSettings?.rushing.touchdown ?? 6} pts</div>
            </div>
            <div>
              <div className="text-slate-400">Pass Yards</div>
              <div className="text-white font-medium">
                1 pt / {leagueSettings?.passing.yards_per_point ?? 25} yds
              </div>
            </div>
            <div>
              <div className="text-slate-400">Rush/Rec Yards</div>
              <div className="text-white font-medium">
                1 pt / {leagueSettings?.rushing.yards_per_point ?? 10} yds
              </div>
            </div>
            <div>
              <div className="text-slate-400">Reception (PPR)</div>
              <div className="text-white font-medium">{leagueSettings?.receiving.reception ?? 1} pt</div>
            </div>
            <div>
              <div className="text-slate-400">INT / Fumble</div>
              <div className="text-white font-medium">{leagueSettings?.passing.interception ?? -2} pts</div>
            </div>
            <div>
              <div className="text-slate-400">FG Made</div>
              <div className="text-white font-medium">{leagueSettings?.kicking.field_goal ?? 3} pts</div>
            </div>
            <div>
              <div className="text-slate-400">XP Made</div>
              <div className="text-white font-medium">{leagueSettings?.kicking.extra_point ?? 1} pts</div>
            </div>
            <div>
              <div className="text-slate-400">Multiplier</div>
              <div className="text-white font-medium">1-4x weeks held</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
