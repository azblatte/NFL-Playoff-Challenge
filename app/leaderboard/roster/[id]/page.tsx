'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  calculateFantasyPointsWithSettings,
  normalizeScoringSettings,
  type PlayerStats,
  type ScoringSettings,
} from '@/lib/scoring';
import NavBar from '@/components/NavBar';

const CURRENT_ROUND = 'WC';

const ROSTER_FIELDS = [
  { key: 'qb_player_key', label: 'QB', weeks: 'qb_weeks_held' },
  { key: 'rb1_player_key', label: 'RB1', weeks: 'rb1_weeks_held' },
  { key: 'rb2_player_key', label: 'RB2', weeks: 'rb2_weeks_held' },
  { key: 'wr1_player_key', label: 'WR1', weeks: 'wr1_weeks_held' },
  { key: 'wr2_player_key', label: 'WR2', weeks: 'wr2_weeks_held' },
  { key: 'te_player_key', label: 'TE', weeks: 'te_weeks_held' },
  { key: 'k_player_key', label: 'K', weeks: 'k_weeks_held' },
  { key: 'dst_player_key', label: 'DST', weeks: 'dst_weeks_held' },
] as const;

type PlayerRow = {
  player_key: string;
  full_name: string;
  team: string;
  position: string;
};

type RosterRow = {
  id: string;
  league_id: string;
  user_id: string;
  round: string;
  submitted_at: string | null;
  profiles: { display_name: string | null } | null;
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
};

type PlayerScoreRow = {
  player_key: string;
  points: number;
  stats: PlayerStats | null;
};

export default function RosterDetailPage() {
  const params = useParams();
  const rosterId = params?.id as string | undefined;
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [roster, setRoster] = useState<RosterRow | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerRow>>({});
  const [scores, setScores] = useState<Record<string, PlayerScoreRow>>({});
  const [leagueSettings, setLeagueSettings] = useState<ScoringSettings | null>(null);

  async function loadData(id: string) {
    setLoading(true);
    setMessage('');

    const rosterResult = await supabase
      .from('rosters')
      .select('id, league_id, user_id, round, submitted_at, profiles:user_id (display_name), qb_player_key, qb_weeks_held, rb1_player_key, rb1_weeks_held, rb2_player_key, rb2_weeks_held, wr1_player_key, wr1_weeks_held, wr2_player_key, wr2_weeks_held, te_player_key, te_weeks_held, k_player_key, k_weeks_held, dst_player_key, dst_weeks_held')
      .eq('id', id)
      .single();

    if (rosterResult.error) {
      setMessage(rosterResult.error.message);
      setLoading(false);
      return;
    }

    setRoster(rosterResult.data as unknown as RosterRow);

    const [playersResult, scoresResult] = await Promise.all([
      supabase.from('player_pool').select('player_key, full_name, team, position').eq('is_active', true),
      supabase.from('player_scores').select('player_key, points, stats').eq('round', (rosterResult.data?.round as string) || CURRENT_ROUND),
    ]);

    if (playersResult.data) {
      const map: Record<string, PlayerRow> = {};
      for (const player of playersResult.data as PlayerRow[]) {
        map[player.player_key] = player;
      }
      setPlayers(map);
    }

    if (scoresResult.data) {
      const map: Record<string, PlayerScoreRow> = {};
      for (const score of scoresResult.data as PlayerScoreRow[]) {
        map[score.player_key] = {
          player_key: score.player_key,
          points: score.points,
          stats: (score.stats as PlayerStats | null) || null,
        };
      }
      setScores(map);
    }

    if (rosterResult.data?.league_id) {
      const { data: league } = await supabase
        .from('leagues')
        .select('scoring_format, scoring_settings')
        .eq('id', rosterResult.data.league_id)
        .single();
      if (league) {
        const normalized = normalizeScoringSettings(
          league.scoring_format || 'PPR',
          (league.scoring_settings as Partial<ScoringSettings> | null) || undefined
        );
        setLeagueSettings(normalized);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!rosterId) return;
    loadData(rosterId);
  }, [rosterId]);

  const rosterItems = useMemo(() => {
    if (!roster) return [];
    return ROSTER_FIELDS.map((field) => {
      const key = roster[field.key as keyof RosterRow] as string | null;
      const weeks = roster[field.weeks as keyof RosterRow] as number;
      const player = key ? players[key] : null;
      const scoreInfo = key ? scores[key] : undefined;
      const scoring = leagueSettings || normalizeScoringSettings('PPR', undefined);
      const basePoints = scoreInfo
        ? (scoreInfo.stats ? calculateFantasyPointsWithSettings(scoreInfo.stats, scoring) : scoreInfo.points)
        : null;
      const totalPoints = basePoints !== null ? basePoints * weeks : null;
      return {
        slot: field.label,
        player,
        weeks,
        basePoints,
        totalPoints,
      };
    });
  }, [roster, players, scores, leagueSettings]);

  const totalPoints = rosterItems.reduce((sum, item) => sum + (item.totalPoints || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Roster not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Roster Details</h1>
            <p className="text-slate-400 text-sm">{roster.profiles?.display_name || 'Unknown'} • {roster.round}</p>
          </div>
          <Link href="/leaderboard" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
            Back to Leaderboard
          </Link>
        </div>
        {message && (
          <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-200">
            {message}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-white font-semibold text-lg">Total Points</div>
            <div className="text-slate-400 text-sm">Submitted: {roster.submitted_at ? new Date(roster.submitted_at).toLocaleString() : 'Not submitted'}</div>
          </div>
          <div className="text-emerald-400 text-3xl font-bold">{totalPoints.toFixed(2)}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rosterItems.map((item) => (
            <div key={item.slot} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="text-slate-400 text-xs uppercase mb-1">{item.slot}</div>
              <div className="text-white font-semibold text-sm">
                {item.player ? item.player.full_name : '—'}
              </div>
              <div className="text-slate-400 text-xs">
                {item.player ? `${item.player.team} • ${item.player.position}` : 'Empty'}
              </div>
              <div className="text-slate-400 text-xs mt-2">Multiplier: {item.weeks}x</div>
              <div className="mt-1 text-xs">
                {item.basePoints !== null ? (
                  <span className="text-emerald-300">Scored {item.basePoints.toFixed(2)} → {item.totalPoints?.toFixed(2)} pts</span>
                ) : (
                  <span className="text-yellow-300">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
