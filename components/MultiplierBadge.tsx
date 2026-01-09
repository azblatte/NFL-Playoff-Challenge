'use client';

type MultiplierBadgeProps = {
  multiplier: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
};

const MULTIPLIER_STYLES: Record<number, { bg: string; glow: string; icon: string }> = {
  1: { bg: 'bg-slate-600', glow: '', icon: '' },
  2: { bg: 'bg-gradient-to-r from-blue-600 to-blue-500', glow: 'shadow-lg shadow-blue-500/30', icon: '⚡' },
  3: { bg: 'bg-gradient-to-r from-purple-600 to-purple-500', glow: 'shadow-lg shadow-purple-500/40', icon: '🔥' },
  4: { bg: 'bg-gradient-to-r from-amber-500 to-yellow-400', glow: 'shadow-lg shadow-amber-500/50 animate-pulse', icon: '⭐' },
};

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export default function MultiplierBadge({ multiplier, size = 'md', showLabel = false }: MultiplierBadgeProps) {
  if (multiplier <= 1) return null;

  const styles = MULTIPLIER_STYLES[multiplier] || MULTIPLIER_STYLES[4];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full font-bold text-white ${styles.bg} ${styles.glow} ${sizeClass}`}
    >
      {styles.icon && <span>{styles.icon}</span>}
      <span>{multiplier}x</span>
      {showLabel && <span className="font-normal opacity-80">loyalty</span>}
    </div>
  );
}

// Larger display variant for roster cards
export function MultiplierRing({ multiplier }: { multiplier: number }) {
  if (multiplier <= 1) return null;

  const colors: Record<number, string> = {
    2: 'border-blue-500 text-blue-400',
    3: 'border-purple-500 text-purple-400',
    4: 'border-amber-400 text-amber-400 animate-pulse',
  };

  const bgColors: Record<number, string> = {
    2: 'bg-blue-500/20',
    3: 'bg-purple-500/20',
    4: 'bg-amber-500/30',
  };

  const icons: Record<number, string> = {
    2: '⚡',
    3: '🔥',
    4: '⭐',
  };

  return (
    <div className={`absolute -top-1 -right-1 w-8 h-8 rounded-full border-2 ${colors[multiplier]} ${bgColors[multiplier]} flex items-center justify-center text-xs font-bold`}>
      <span className="mr-0.5">{icons[multiplier]}</span>
      {multiplier}x
    </div>
  );
}

// Shows eliminated status for players whose team lost
export function EliminatedOverlay({ playerName, team }: { playerName?: string; team?: string }) {
  return (
    <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center">
      <div className="text-red-400 text-3xl mb-1">❌</div>
      <div className="text-white font-bold text-sm">ELIMINATED</div>
      {team && <div className="text-red-300 text-xs mt-1">{team} lost</div>}
    </div>
  );
}
