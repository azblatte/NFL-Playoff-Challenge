'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { normalizeScoringSettings, type ScoringSettings } from '@/lib/scoring';
import NavBar from '@/components/NavBar';
import { useAdminSession } from '@/components/AdminSessionProvider';

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
const ACTIVE_LEAGUE_KEY = 'activeLeagueId';

type ScoringFormat = 'PPR' | 'HALF_PPR' | 'STANDARD';

type LeagueRow = {
  id: string;
  name: string;
  join_code: string | null;
  scoring_format: ScoringFormat;
  owner_user_id: string | null;
  scoring_settings: Partial<ScoringSettings> | null;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { adminUnlocked, setAdminUnlocked, setAdminPassword } = useAdminSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [activeLeagueId, setActiveLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [league, setLeague] = useState<LeagueRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Scoring settings state
  const [leagueName, setLeagueName] = useState('');
  const [scoringFormat, setScoringFormat] = useState<ScoringFormat>('PPR');
  const [settings, setSettings] = useState<ScoringSettings>(normalizeScoringSettings('PPR', undefined));

  useEffect(() => {
    checkAuth();
    if (typeof window !== 'undefined') {
      const savedLeagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (savedLeagueId) setActiveLeagueId(savedLeagueId);
    }
  }, []);

  useEffect(() => {
    if (adminUnlocked && user) {
      loadLeagueSettings();
    }
  }, [adminUnlocked, user, activeLeagueId]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUser(user);
    setLoading(false);
  }

  async function loadLeagueSettings() {
    if (!user) return;

    // Check if user is admin/owner of active league
    const { data: membership } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', activeLeagueId)
      .eq('user_id', user.id)
      .single();

    const canAdmin = membership?.role === 'owner' || membership?.role === 'admin';
    setIsAdmin(canAdmin);

    if (!canAdmin) {
      setLeague(null);
      return;
    }

    // Load league details
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('id, name, join_code, scoring_format, owner_user_id, scoring_settings')
      .eq('id', activeLeagueId)
      .single();

    if (leagueData) {
      setLeague(leagueData as LeagueRow);
      setLeagueName(leagueData.name);
      setScoringFormat(leagueData.scoring_format as ScoringFormat);
      const normalized = normalizeScoringSettings(
        leagueData.scoring_format as ScoringFormat,
        leagueData.scoring_settings as Partial<ScoringSettings> | undefined
      );
      setSettings(normalized);
    }
  }

  function showMessage(msg: string, type: 'success' | 'error') {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
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

  function updateSetting(
    category: keyof ScoringSettings,
    field: string,
    value: number
  ) {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  }

  async function handleSave() {
    if (!league) return;
    setSaving(true);

    // Update reception value based on format
    const updatedSettings = { ...settings };
    if (scoringFormat === 'PPR') {
      updatedSettings.receiving.reception = 1;
    } else if (scoringFormat === 'HALF_PPR') {
      updatedSettings.receiving.reception = 0.5;
    } else {
      updatedSettings.receiving.reception = 0;
    }

    const { error } = await supabase
      .from('leagues')
      .update({
        name: leagueName.trim() || league.name,
        scoring_format: scoringFormat,
        scoring_settings: updatedSettings,
      })
      .eq('id', league.id);

    if (error) {
      showMessage(error.message, 'error');
    } else {
      setSettings(updatedSettings);
      showMessage('Settings saved successfully!', 'success');
      await loadLeagueSettings();
    }
    setSaving(false);
  }

  function handleResetToDefaults() {
    if (!confirm('Reset all scoring settings to defaults for ' + scoringFormat + '?')) return;
    setSettings(normalizeScoringSettings(scoringFormat, undefined));
    showMessage('Settings reset to defaults. Click Save to apply.', 'success');
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
            <h1 className="text-xl font-bold text-white mb-2">Admin Login Required</h1>
            <p className="text-slate-400 text-sm mb-6">
              Enter the admin password to access scoring settings.
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
              Unlock Settings
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900">
        <NavBar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-400 mb-4">
              You need to be an owner or admin of a league to access scoring settings.
            </p>
            <Link
              href="/league"
              className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition"
            >
              Go to League Hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Scoring Settings</h1>
            <p className="text-slate-400 text-sm">
              Customize all scoring rules for {league?.name || 'your league'}
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            Back to Admin
          </Link>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            messageType === 'success' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-200' :
            'bg-red-900/50 border-red-700 text-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* League Info */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">League Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">League Name</label>
              <input
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Scoring Format</label>
              <select
                value={scoringFormat}
                onChange={(e) => {
                  const newFormat = e.target.value as ScoringFormat;
                  setScoringFormat(newFormat);
                  // Auto-update reception points
                  const receptionPts = newFormat === 'PPR' ? 1 : newFormat === 'HALF_PPR' ? 0.5 : 0;
                  updateSetting('receiving', 'reception', receptionPts);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              >
                <option value="PPR">PPR (1 pt per reception)</option>
                <option value="HALF_PPR">Half PPR (0.5 pts per reception)</option>
                <option value="STANDARD">Standard (no reception points)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Passing */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Passing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Yards per Point</label>
              <input
                type="number"
                value={settings.passing.yards_per_point}
                onChange={(e) => updateSetting('passing', 'yards_per_point', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
              <div className="text-xs text-slate-500 mt-1">e.g. 25 = 1 pt per 25 yards</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Touchdown Points</label>
              <input
                type="number"
                step="0.5"
                value={settings.passing.touchdown}
                onChange={(e) => updateSetting('passing', 'touchdown', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Interception Points</label>
              <input
                type="number"
                step="0.5"
                value={settings.passing.interception}
                onChange={(e) => updateSetting('passing', 'interception', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
              <div className="text-xs text-slate-500 mt-1">Usually negative (e.g. -2)</div>
            </div>
          </div>
        </div>

        {/* Rushing */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Rushing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Yards per Point</label>
              <input
                type="number"
                value={settings.rushing.yards_per_point}
                onChange={(e) => updateSetting('rushing', 'yards_per_point', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
              <div className="text-xs text-slate-500 mt-1">e.g. 10 = 1 pt per 10 yards</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Touchdown Points</label>
              <input
                type="number"
                step="0.5"
                value={settings.rushing.touchdown}
                onChange={(e) => updateSetting('rushing', 'touchdown', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Receiving */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Receiving</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Yards per Point</label>
              <input
                type="number"
                value={settings.receiving.yards_per_point}
                onChange={(e) => updateSetting('receiving', 'yards_per_point', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
              <div className="text-xs text-slate-500 mt-1">e.g. 10 = 1 pt per 10 yards</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Touchdown Points</label>
              <input
                type="number"
                step="0.5"
                value={settings.receiving.touchdown}
                onChange={(e) => updateSetting('receiving', 'touchdown', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Points per Reception</label>
              <input
                type="number"
                step="0.5"
                value={settings.receiving.reception}
                onChange={(e) => updateSetting('receiving', 'reception', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
              <div className="text-xs text-slate-500 mt-1">PPR=1, Half=0.5, Standard=0</div>
            </div>
          </div>
        </div>

        {/* Kicking */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Kicking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Field Goal Points</label>
              <input
                type="number"
                step="0.5"
                value={settings.kicking.field_goal}
                onChange={(e) => updateSetting('kicking', 'field_goal', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Extra Point Points</label>
              <input
                type="number"
                step="0.5"
                value={settings.kicking.extra_point}
                onChange={(e) => updateSetting('kicking', 'extra_point', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Defense */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Defense / Special Teams</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Touchdown</label>
              <input
                type="number"
                step="0.5"
                value={settings.defense.touchdown}
                onChange={(e) => updateSetting('defense', 'touchdown', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Sack</label>
              <input
                type="number"
                step="0.5"
                value={settings.defense.sack}
                onChange={(e) => updateSetting('defense', 'sack', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Interception</label>
              <input
                type="number"
                step="0.5"
                value={settings.defense.interception}
                onChange={(e) => updateSetting('defense', 'interception', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Fumble Rec</label>
              <input
                type="number"
                step="0.5"
                value={settings.defense.fumble_recovery}
                onChange={(e) => updateSetting('defense', 'fumble_recovery', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Safety</label>
              <input
                type="number"
                step="0.5"
                value={settings.defense.safety}
                onChange={(e) => updateSetting('defense', 'safety', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Fumbles */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Turnovers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Fumble Lost Points</label>
              <input
                type="number"
                step="0.5"
                value={settings.fumbles.lost}
                onChange={(e) => updateSetting('fumbles', 'lost', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
              <div className="text-xs text-slate-500 mt-1">Usually negative (e.g. -2)</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={handleResetToDefaults}
            className="px-6 py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-2">About Scoring Settings</h3>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>Changes apply to all future score calculations for this league.</li>
            <li>Existing player scores will be recalculated when syncing.</li>
            <li>The multiplier system (1-4x) is separate from these settings.</li>
            <li>Use whole or half points for most categories if you want finer control.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
