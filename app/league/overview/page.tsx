'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  calculateFantasyPointsWithSettings,
  normalizeScoringSettings,
  type PlayerStats,
  type ScoringSettings,
} from '@/lib/scoring';
import NavBar from '@/components/NavBar';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const ACTIVE_LEAGUE_KEY = 'activeLeagueId';

const ROUND_NAMES: Record<string, string> = {
  WC: 'Wild Card',
  DIV: 'Divisional',
  CONF: 'Conference',
  SB: 'Super Bowl',
};

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

type LeagueRow = {
  id: string;
  name: string;
  join_code: string | null;
  scoring_format: 'PPR' | 'HALF_PPR' | 'STANDARD';
  scoring_settings?: Partial<ScoringSettings> | null;
};

type PlayerRow = {
  player_key: string;
  full_name: string;
  team: string;
  position: string;
};

type RosterRow = {
  id: string;
  user_id: string;
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

type MemberInfo = {
  user_id: string;
  team_name: string | null;
};

type PlayerScoreRow = {
  player_key: string;
  points: number;
  stats: PlayerStats | null;
};

export default function LeagueOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeLeagueId, setActiveLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [league, setLeague] = useState<LeagueRow | null>(null);
  const [rosters, setRosters] = useState<RosterRow[]>([]);
  const [players, setPlayers] = useState<Record<string, PlayerRow>>({});
  const [scores, setScores] = useState<Record<string, PlayerScoreRow>>({});
  const [memberTeams, setMemberTeams] = useState<Record<string, string>>({});
  const [leagueSettings, setLeagueSettings] = useState<ScoringSettings | null>(null);
  const [currentRound, setCurrentRound] = useState('WC');

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    if (typeof window !== 'undefined') {
      const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (savedLeagueId) setActiveLeagueId(savedLeagueId);
    }

    // Load current round from settings
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

  async function loadData() {
    setLoading(true);
    setMessage('');

    const leagueResult = await supabase
      .from('leagues')
      .select('id, name, join_code, scoring_format, scoring_settings')
      .eq('id', activeLeagueId)
      .single();

    if (leagueResult.error) {
      setMessage(leagueResult.error.message);
    } else {
      const leagueData = leagueResult.data as LeagueRow;
      setLeague(leagueData);
      const normalized = normalizeScoringSettings(
        leagueData.scoring_format || 'PPR',
        leagueData.scoring_settings || undefined
      );
      setLeagueSettings(normalized);
    }

    const [rostersResult, playersResult, scoresResult, membersResult] = await Promise.all([
      supabase
        .from('rosters')
        .select('id, user_id, submitted_at, profiles:user_id (display_name), qb_player_key, qb_weeks_held, rb1_player_key, rb1_weeks_held, rb2_player_key, rb2_weeks_held, wr1_player_key, wr1_weeks_held, wr2_player_key, wr2_weeks_held, te_player_key, te_weeks_held, k_player_key, k_weeks_held, dst_player_key, dst_weeks_held')
        .eq('league_id', activeLeagueId)
        .eq('round', currentRound),
      supabase
        .from('player_pool')
        .select('player_key, full_name, team, position')
        .eq('is_active', true),
      supabase
        .from('player_scores')
        .select('player_key, points, stats')
        .eq('round', currentRound),
      supabase
        .from('league_members')
        .select('user_id, team_name')
        .eq('league_id', activeLeagueId),
    ]);

    if (rostersResult.error) {
      setMessage(rostersResult.error.message);
    } else {
      setRosters((rostersResult.data || []) as unknown as RosterRow[]);
    }

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

    if (membersResult.data) {
      const map: Record<string, string> = {};
      for (const member of membersResult.data as MemberInfo[]) {
        if (member.team_name) {
          map[member.user_id] = member.team_name;
        }
      }
      setMemberTeams(map);
    }

    setLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (activeLeagueId) {
      loadData();
    }
  }, [activeLeagueId]);

  const rosterCards = useMemo(() => {
    return rosters
      .map((roster) => {
        const items = ROSTER_FIELDS.map((field) => {
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
            playerKey: key,
            player,
            weeks,
            basePoints,
            totalPoints,
          };
        });

        const total = items.reduce((sum, item) => sum + (item.totalPoints || 0), 0);

        return {
          roster,
          items,
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [rosters, players, scores, leagueSettings]);

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

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">League Home</h1>
            <p className="text-slate-400 text-sm">{league ? `${league.name} • ${league.scoring_format}` : 'League overview'}</p>
          </div>
          <div className="text-slate-400 text-sm">Round: {ROUND_NAMES[currentRound] || currentRound}</div>
        </div>
        {message && (
          <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-200">
            {message}
          </div>
        )}

        {league && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-white font-semibold">Join Code: {league.join_code || 'N/A'}</div>
              <div className="text-slate-400 text-sm">Round: {ROUND_NAMES[currentRound] || currentRound}</div>
            </div>
            <div className="text-slate-400 text-sm">Total Rosters: {rosters.length}</div>
          </div>
        )}

        {rosterCards.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-slate-400">
            No rosters submitted yet for this league.
          </div>
        ) : (
          <div className="space-y-6">
            {rosterCards.map(({ roster, items, total }) => {
              const displayName = roster.profiles?.display_name || 'Unknown';
              const teamName = memberTeams[roster.user_id] || displayName;
              return (
              <div key={roster.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <div>
                    <div className="text-white font-semibold text-lg">
                      {teamName}
                      <span className="ml-2 text-slate-400 font-normal text-sm">({displayName})</span>
                    </div>
                    <div className="text-slate-400 text-sm">Submitted: {roster.submitted_at ? new Date(roster.submitted_at).toLocaleString() : 'Not submitted'}</div>
                  </div>
                  <div className="text-emerald-400 font-bold text-lg">{total.toFixed(2)} pts</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {items.map((item) => (
                    <div key={`${roster.id}-${item.slot}`} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                      <div className="text-slate-400 text-xs uppercase mb-1">{item.slot}</div>
                      <div className="text-white font-semibold text-sm">
                        {item.player ? item.player.full_name : '—'}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {item.player ? `${item.player.team} • ${item.player.position}` : 'Empty'}
                      </div>
                      <div className="text-slate-400 text-xs mt-2">
                        Multiplier: {item.weeks}x
                      </div>
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
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
