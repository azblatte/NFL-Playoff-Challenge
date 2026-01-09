'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { href: '/roster', label: 'Roster', icon: '📋' },
  { href: '/leaderboard', label: 'Standings', icon: '🏆' },
  { href: '/league', label: 'League', icon: '🏈' },
];

const ACTIVE_LEAGUE_KEY = 'activeLeagueId';
const ADMIN_UNLOCK_KEY = 'adminUnlocked';

export default function NavBar() {
  const pathname = usePathname();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadAdminAccess() {
      if (typeof window === 'undefined') return;
      if (window.localStorage.getItem(ADMIN_UNLOCK_KEY) === 'true') {
        if (isActive) setShowAdmin(true);
        return;
      }
      const leagueId = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
      if (!leagueId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('league_members')
        .select('role')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .single();

      if (!isActive) return;
      setShowAdmin(data?.role === 'owner' || data?.role === 'admin');
    }

    loadAdminAccess();
    return () => {
      isActive = false;
    };
  }, []);

  const showAdminLink = showAdmin || pathname?.startsWith('/admin');
  const navItems = showAdminLink
    ? [...BASE_NAV_ITEMS, { href: '/admin', label: 'Admin', icon: '⚙️' }]
    : BASE_NAV_ITEMS;

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Home */}
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <span>🏈</span>
            <span className="hidden sm:inline">Playoff Challenge</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
