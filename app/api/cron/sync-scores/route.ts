import { NextRequest, NextResponse } from 'next/server';
import { syncScores } from '@/lib/scoring-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (set by Vercel)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine current round (hardcoded for now, make dynamic later)
    const currentRound = 'WC'; // TODO: Make this dynamic

    // Run sync
    const result = await syncScores(currentRound);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Cron sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
