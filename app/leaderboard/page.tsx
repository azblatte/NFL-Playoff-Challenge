'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const CURRENT_ROUND = 'WC';

export default function Leaderboard() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadLeaderboard() {
    try {
      // Get all rosters for this round
      const { data: rosters } = await supabase
        .from('rosters')
        .select(\`
          *,
          profiles:user_id (display_name)
        \`)
        .eq('league_id', DEFAULT_LEAGUE_ID)
        .eq('round', CURRENT_ROUND);

      if (!rosters) return;

      // Get all player scores
      const { data: scores } = await supabase
        .from('player_scores')
        .select('*')
        .eq('round', CURRENT_ROUND);

      const scoreMap = new Map(scores?.map(s => [s.player_key, s.points]) || []);

      // Calculate totals
      const results = rosters.map(r => {
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
          const base = scoreMap.get(p.key) || 0;
          return sum + (base * p.mult);
        }, 0);

        return {
          name: r.profiles?.display_name || 'Unknown',
          points: Math.round(total * 100) / 100,
          roster: r
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/roster')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit Roster
              </button>
              <button
                onClick={loadLeaderboard}
                className="text-gray-600 hover:text-gray-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50"
                >
                  <div className="text-2xl font-bold text-gray-400 w-12">
                    #{i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{entry.name}</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {entry.points} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
