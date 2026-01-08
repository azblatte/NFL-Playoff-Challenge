'use client';

import { useState } from 'react';
import { syncScores } from '@/lib/scoring-sync';

const ADMIN_PASSWORD = 'changeme123'; // Change this in production

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);

    try {
      const res = await syncScores('WC');
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, errors: [err.message] });
    } finally {
      setSyncing(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password === ADMIN_PASSWORD) {
                setAuthed(true);
              }
            }}
            className="w-full px-4 py-3 rounded-lg border mb-4"
            placeholder="Enter admin password"
          />
          <button
            onClick={() => {
              if (password === ADMIN_PASSWORD) setAuthed(true);
              else alert('Incorrect password');
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Force Sync Scores</h2>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {result && (
            <div className="p-4 rounded-lg bg-blue-50">
              <h3 className="font-bold mb-2">Sync Result</h3>
              <div className="text-sm">
                <p>Success: {result.success ? 'Yes' : 'No'}</p>
                <p>Games Processed: {result.gamesProcessed}</p>
                <p>Players Updated: {result.playersUpdated}</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Errors:</p>
                    {result.errors.map((err: string, i: number) => (
                      <p key={i} className="text-red-600">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
