import { NextResponse } from 'next/server';
import { syncScores } from '@/lib/scoring-sync';

const ROUNDS = ['WC', 'DIV', 'CONF', 'SB'] as const;
type Round = typeof ROUNDS[number];

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers.get('x-admin-password');

  if (!adminPassword || providedPassword !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roundParam = searchParams.get('round') || 'WC';
  const round = ROUNDS.includes(roundParam as Round) ? (roundParam as Round) : null;

  if (!round) {
    return NextResponse.json({ error: 'Invalid round.' }, { status: 400 });
  }

  try {
    const result = await syncScores(round);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
