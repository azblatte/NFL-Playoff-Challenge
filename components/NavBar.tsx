'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/roster', label: 'Roster', icon: '📋' },
  { href: '/leaderboard', label: 'Standings', icon: '🏆' },
  { href: '/league', label: 'League', icon: '🏈' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
];

export default function NavBar() {
  const pathname = usePathname();

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
            {NAV_ITEMS.map((item) => {
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
