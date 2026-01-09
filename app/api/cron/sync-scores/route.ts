import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine current round from app settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'current_round')
      .single();

    const currentRound = (typeof settingsData?.value === 'string'
      ? settingsData.value : JSON.stringify(settingsData?.value || 'WC')).replace(/"/g, '');

    if (settingsError) {
      console.warn('Failed to read current_round, defaulting to WC:', settingsError.message);
    }

    // Run sync
    const result = await syncScores(currentRound as 'WC' | 'DIV' | 'CONF' | 'SB');

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
