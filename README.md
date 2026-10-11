# Dhaka Transit

Next.js (App Router) + Tailwind + React-Leaflet (OpenStreetMap) + Mapbox + Supabase.

## 1. Supabase (SQL Editor, run in this order)
1. `supabase/schema.sql`
2. `supabase/functions.sql`
3. `supabase/seed.sql`  (sample data, test only)

## 2. Environment variables
Set these in Vercel (Project Settings > Environment Variables) and, for local runs, in `.env.local`:

    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    MAPBOX_TOKEN=

## 3. Run locally
    npm install
    npm run dev

## 4. Deploy
Push to GitHub, import the repo in Vercel, add the 3 env vars, Deploy.
