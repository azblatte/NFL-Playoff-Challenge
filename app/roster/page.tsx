'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const CURRENT_ROUND = 'WC'; // Update this as playoffs progress

export default function RosterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [roster, setRoster] = useState({
    qb: '', rb1: '', rb2: '', wr1: '', wr2: '', te: '', k: '', dst: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkUser();
    loadPlayers();
    loadRoster();
  }, []);

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
      .eq('is_active', true)
      .order('full_name');

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
      .eq('league_id', DEFAULT_LEAGUE_ID)
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
          league_id: DEFAULT_LEAGUE_ID,
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
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const byPosition = (pos: string) => players.filter(p => p.position === pos);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Build Your Roster</h1>
            <button
              onClick={() => router.push('/leaderboard')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View Leaderboard
            </button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Round:</strong> Wild Card | <strong>Tip:</strong> Keep players across rounds to earn multipliers (2x, 3x, 4x)!
            </p>
          </div>

          <div className="space-y-6">
            {[
              { label: 'Quarterback (QB)', key: 'qb' as const, pos: 'QB' },
              { label: 'Running Back 1 (RB)', key: 'rb1' as const, pos: 'RB' },
              { label: 'Running Back 2 (RB)', key: 'rb2' as const, pos: 'RB' },
              { label: 'Wide Receiver 1 (WR)', key: 'wr1' as const, pos: 'WR' },
              { label: 'Wide Receiver 2 (WR)', key: 'wr2' as const, pos: 'WR' },
              { label: 'Tight End (TE)', key: 'te' as const, pos: 'TE' },
              { label: 'Kicker (K)', key: 'k' as const, pos: 'K' },
              { label: 'Defense/ST (DST)', key: 'dst' as const, pos: 'DST' },
            ].map(({ label, key, pos }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                </label>
                <select
                  value={roster[key]}
                  onChange={(e) => setRoster({ ...roster, [key]: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a player...</option>
                  {byPosition(pos).map(p => (
                    <option key={p.player_key} value={p.player_key}>
                      {p.full_name} - {p.team}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {message && (
            <div className="mt-6 p-4 rounded-lg bg-green-50 text-green-700">
              {message}
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <button
              onClick={saveRoster}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Roster'}
            </button>
            <button
              onClick={() => router.push('/leaderboard')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
