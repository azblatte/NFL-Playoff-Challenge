# 🚀 Deployment Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create account or sign in
4. Click "New project"
5. Fill in:
   - Name: `nfl-playoff-challenge`
   - Database Password: (save this somewhere safe)
   - Region: (choose closest to you)
   - Pricing: Free tier
6. Click "Create new project" (takes 2-3 minutes)

## Step 2: Run Database Migrations

1. In your Supabase dashboard, click "SQL Editor" in left sidebar
2. Click "New query"
3. Run each migration file in order:
   - `001_initial.sql` - Core tables (profiles, player_pool, rosters, etc.)
   - `002_seed_players.sql` - Seeds 340+ playoff players
   - `003_leagues.sql` - League system tables
   - `004_league_admin.sql` - Admin roles and permissions
   - `005_league_member_policies.sql` - RLS policies for members
   - `006_league_insert_policy.sql` - Join league policies
   - `007_team_names.sql` - Team name column for fantasy team names
   - `008_fix_league_member_policy.sql` - Fix recursive policy
   - `009_league_delete_policy.sql` - Allow owners to delete leagues
   - `010_scoring_settings.sql` - Customizable scoring per league
4. Verify in Table Editor - you should see 340+ rows in `player_pool`

## Step 3: Get Supabase Credentials

1. In Supabase dashboard, click "Project Settings" (gear icon)
2. Click "API" in left sidebar
3. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 4: Update Local Environment

1. Open `.env.local` in your project
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_PASSWORD=yourSecurePassword123
CRON_SECRET=leave-empty-vercel-will-set-this
```

3. Save the file

## Step 5: Test Locally

```bash
npm run dev
```

1. Go to `http://localhost:3000`
2. Click "Sign up"
3. Create account with email + password + display name
4. Should redirect to `/roster`
5. Try selecting players (if dropdown empty, check Supabase migration)
6. Save roster
7. Go to `/leaderboard` - should see your entry
8. Go to `/admin` - enter admin password - try "Sync Now"

## Step 6: Deploy to Vercel

### Option A: GitHub Deploy (Recommended)

1. Create GitHub repo:
```bash
git remote add origin https://github.com/yourusername/playoff-challenge.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "Add New..." → "Project"
4. Import your GitHub repo
5. Vercel will auto-detect Next.js

6. Add Environment Variables:
   - Click "Environment Variables"
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL` = (your URL)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your key)
     - `ADMIN_PASSWORD` = (your admin password)
   - Leave `CRON_SECRET` empty (Vercel generates this)

7. Click "Deploy"
8. Wait 2-3 minutes
9. Click the live URL!

### Option B: Vercel CLI Deploy

```bash
npm install -g vercel
vercel login
vercel --prod
```

Follow prompts and add env vars when asked.

## Step 7: Enable Cron Jobs

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Cron Jobs"
3. Verify `sync-scores` job is listed (from vercel.json)
4. Schedule: `*/5 * * * *` (every 5 minutes)
5. It will auto-enable when you deploy

## Step 8: Add Wild Card Schedule

1. Go to Supabase dashboard → SQL Editor
2. Create query with Wild Card game times:

```sql
INSERT INTO playoff_schedule (espn_game_id, round, home_team, away_team, kickoff_time)
VALUES
  ('game-id-1', 'WC', 'HOU', 'LAC', '2026-01-11 16:30:00+00'),
  ('game-id-2', 'WC', 'BAL', 'PIT', '2026-01-11 20:15:00+00'),
  -- Add all 6 Wild Card games
;
```

(Get ESPN game IDs from `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` after games are announced)

## Step 9: Share with League

1. Get your Vercel URL (e.g., `playoff-challenge.vercel.app`)
2. **Create your league first:**
   - Sign up at your URL
   - Go to `/league`
   - Click "Create League" with your league name
   - Note the 6-character join code (e.g., "ABC123")
3. **Send to league members:**
   - Share URL and join code
   - Instructions for users:
     - Go to URL
     - Sign up with email + password + display name
     - Go to "League" page
     - Enter join code + team name (their fantasy team name)
     - Go to "Roster" to pick 8 players
     - Check leaderboard during games!

## Step 10: Monitor During Games

### As League Admin:
1. Go to `/league` - you'll see "League Settings" section
2. Customize scoring (field goals, extra points) if needed
3. Download backup CSV anytime from `/admin`
4. Advance round when playoffs progress (copies rosters with +1 multiplier)

### As Site Admin:
1. Go to `/admin`
2. Enter admin password
3. Click "Sync Now" to manually refresh scores
4. Check Vercel logs for cron job runs
5. Download backup CSV for disaster recovery

### Auto-Sync:
- Cron job runs every 5 minutes
- Fetches live stats from ESPN
- Updates player_scores table
- Leaderboard auto-refreshes every 30 seconds

## Troubleshooting

**Players not showing in roster builder?**
- Check Supabase Table Editor → player_pool has data
- Re-run `002_seed_players.sql` if empty

**Can't log in?**
- Check Supabase URL & key in env vars
- Check Vercel logs for errors

**Scores not updating?**
- Check Vercel → Functions → Logs
- Manually trigger via `/admin`
- Verify ESPN game IDs in playoff_schedule table

**Cron not running?**
- Verify vercel.json is committed
- Check Vercel dashboard → Cron Jobs
- May need to trigger first deploy after adding

## Next Steps

### Before Divisional Round:
- Update `CURRENT_ROUND` to `'DIV'` in pages
- Add Divisional game schedule to playoff_schedule
- Calculate multipliers for kept players

### Add Kickers & Defenses:
```bash
npm run scrape-rosters
```
Then manually add K/DST rows to player_pool if missing

### Production Polish:
- Change admin password from code to env var
- Add error boundaries
- Add loading skeletons
- Test on mobile
- Add player lock warnings

---

## Quick Reference

- **App URL:** `https://your-app.vercel.app`
- **Admin:** `/admin`
- **Supabase Dashboard:** `https://supabase.com/dashboard`
- **Vercel Dashboard:** `https://vercel.com/dashboard`
- **ESPN API:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`

Good luck! 🏈
