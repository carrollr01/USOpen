# U.S. Open Pool — Pick 6, Use 4

A small live-scoring web app for a 7-person U.S. Open golf pool.

- Each player picked **6 golfers**; the **best 4** scores count toward their team total.
- A golfer who **misses the cut / WD / DQ** counts as **their score at the cut + 20**.
- **Lowest team total wins.**
- Two views: **My Team** (your golfers, who's counting, your score and position) and **League** (full standings, tap a player to see their golfers).
- Live scores poll automatically every ~30s from ESPN's public PGA leaderboard.

## Tech

- Next.js 14 (App Router) + TypeScript + Tailwind
- Neon Postgres via `@neondatabase/serverless`
- Lightweight cookie-session auth (Web Crypto), claim-on-first-login

## Sign-in

The 7 players are pre-loaded (Nate, Grant, Dec, Ryan, Cole, Max, Gavin). The
**first** time someone signs in as their name, whatever password they type
becomes their password. After that it must match. It's intentionally simple —
sign-in just distinguishes accounts.

## Deploy (Vercel + Neon)

1. Push this repo and import it into Vercel (Framework preset: **Next.js**).
2. In the Vercel project, open the **Storage** tab → **Create Database** →
   **Neon** (Postgres). Accept the defaults and connect it to the project. This
   auto-injects `DATABASE_URL` / `POSTGRES_URL` into all environments.
3. Add an environment variable **`AUTH_SECRET`** (Settings → Environment
   Variables) — any long random string (`openssl rand -hex 32`). This keeps
   sessions stable across deploys.
4. **Redeploy** so the new env vars take effect.
5. Visit the site, pick your name, set a password. Tables are created and the
   league is seeded automatically on first use. (You can also hit
   `/api/init?key=<AUTH_SECRET>` once to seed eagerly.)

## Local development

```bash
npm install
# .env.local
#   DATABASE_URL=<your Neon connection string>
#   AUTH_SECRET=<any long random string>
npm run dev
```

## How scoring works

- Live field is pulled from `site.api.espn.com/.../golf/pga/leaderboard`.
- Each picked golfer is matched to the live field by surname + first initial
  (so Alex vs Matt Fitzpatrick and Dustin Johnson resolve correctly).
- `effective score` = golfer's score to par, **+20 if cut/WD/DQ**.
- A team's total = sum of its **4 lowest** effective scores.
- Ties share a position (e.g., `T2`).

## Resolved picks

The original sheet used last names; resolved full names:

| Sheet | Golfer |
|---|---|
| A. Fitzpatrick | Alex Fitzpatrick |
| D. Johnson | Dustin Johnson |
| Hojgaard | Nicolai Hojgaard |
| Conners | Corey Conners |
| Young | Cameron Young |
| Poston | J.T. Poston |
| Spaun | J.J. Spaun |
