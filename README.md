# 🏈 NFL Playoff Challenge 2026

Full-featured fantasy playoff game with automated ESPN API scoring, real-time leaderboards, and multiplier tracking.

## Quick Setup

### 1. Install
```bash
npm install
```

### 2. Supabase Setup
1. Create account at supabase.com
2. Create new project  
3. Run SQL files in SQL Editor:
   - `supabase/migrations/001_initial.sql`
   - `supabase/migrations/002_seed_players.sql`

### 3. Environment
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
ADMIN_PASSWORD=changeme
CRON_SECRET=vercel-generates-this
```

### 4. Run
```bash
npm run dev
```

### 5. Deploy to Vercel
```bash
git push
# Connect repo on vercel.com
# Add env vars
# Deploy!
```

## Features
- Auto ESPN API scoring (every 5 min)
- 8-position rosters (QB, 2RB, 2WR, TE, K, DST)
- Multipliers (1x→2x→3x→4x)
- Live leaderboard
- Admin dashboard

## Tech Stack
Next.js 14 | TypeScript | Tailwind | Supabase | Vercel

Built with Claude Code
