# Checkpoint 2 — ResQ-Aid Backend

## Environment & Tooling
- Node.js + npm working (fixed PowerShell execution-policy issue)
- Project structured as resq-aid/backend/
- package.json configured with "type": "module"
- Dependencies installed: express, cors, dotenv, multer, @supabase/supabase-js, @google/genai
- .env holds SUPABASE_URL, SUPABASE_ANON_KEY (service_role key), GEMINI_API_KEY
- .gitignore protecting .env and node_modules — confirmed never committed to git history

## Backend Structure
- src/app.js — Express app, middleware, route mounting
- src/server.js — entrypoint, port 5000
- src/config/supabase.js — Supabase client
- src/config/gemini.js — Google GenAI client
- src/middleware/errorHandler.js — asyncHandler, notFoundHandler, errorHandler
- /health endpoint working

## Database (Supabase Postgres + PostGIS)
- PostGIS extension enabled
- 9 tables: profiles, ngos, volunteer_profiles, rescue_teams, rescue_cases,
  rescue_updates, animals, adoptions, notifications
- Auto-profile-creation trigger on signup (role defaults to 'citizen')
- Row Level Security enabled + policies written on all 9 tables
- migrations/ folder has a saved copy of every SQL statement run

## Dispatch Feature — WORKING, tested end-to-end
- nearest_available_team(lat, lng, radius_meters) PostGIS function
- Test rescue teams inserted (real Kathmandu coordinates)
- GET /api/dispatch/nearest-team?lat=...&lng=... — tested live, correct results