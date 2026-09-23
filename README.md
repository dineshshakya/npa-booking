# NPA Booking — North Park Acupuncture online booking

A lightweight booking web app with **no server to run and no Google services**:
React frontend (hosted free on GitHub Pages) + Supabase (free Postgres + Auth + Storage) as the backend.

Live site (after setup): **https://dineshshakya.github.io/npa-booking/**

## How it works

- **Landing** — hero, trust strip, 8 service tiles, conditions pills, first-visit stepper, about/reviews/contact, book banner
- **Pick a time** — 14-day date strip + 30-min slot grid (8:00 AM–4:00 PM Pacific), live from the database
- **Book** — 3-step intake: your details + insurance-card photo → visit details → review & confirm
- **Clinic login** — staff sign in (Supabase Auth) to see bookings, view insurance photos, delete bookings
- **Rules** — 60-minute appointments; a PostgreSQL exclusion constraint makes overlapping bookings impossible even if two people submit at the same second; every field is validated in the form and re-checked by database constraints
- **Email alerts** — a Supabase edge function emails the clinic on each new booking (optional, via Resend)

## Setup (do once)

Steps marked **[you]** need a human in the Supabase/GitHub dashboards.

### 1. Create a free Supabase project [you]

1. Go to https://supabase.com → Sign up / Sign in → **New project**
2. Name it `npa-booking`, pick a region near you, set a database password (save it)
3. Wait ~2 minutes for the project to spin up

### 2. Run the database schema [you]

1. In the Supabase dashboard: **SQL Editor → New query**
2. Open `supabase/schema.sql` in this repo, copy the **entire** file, paste it, press **Run**
3. You should see "Success. No rows returned" — this creates the `bookings` table, security policies, the availability function, and the private `insurance-cards` storage bucket

### 3. Create the clinic staff login [you]

1. In the Supabase dashboard: **Authentication → Users → Add user → Create new user**
2. Enter the clinic's email + a password, check **Auto Confirm User**, press **Create**
3. The clinic signs in on the site's **Clinic login** page with these credentials

### 4. Add the Supabase keys to GitHub [you]

1. In Supabase: **Project Settings → API** — copy the **Project URL** and the **anon public** key
2. In GitHub: open the `npa-booking` repo → **Settings → Secrets and variables → Actions → New repository secret**
3. Add `VITE_SUPABASE_URL` = the Project URL
4. Add `VITE_SUPABASE_ANON_KEY` = the anon public key
5. Push any commit to `main` (or re-run the workflow) — the site builds and deploys to GitHub Pages automatically

> The `anon` key is safe to embed in the website: Row Level Security only lets it
> insert bookings and read booked start times. Patient data is readable only by
> signed-in staff.

### 5. Booking email alerts (optional) [you]

1. Create a free account at https://resend.com and copy an API key
2. Install the Supabase CLI locally (`npm i -g supabase`), then from this repo:
   ```
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy notify-booking
   supabase secrets set RESEND_API_KEY=your_key NOTIFY_TO=clinic@email.com
   ```
3. In the Supabase dashboard: **Database → Webhooks → Create a new webhook**
   - Name: `notify-booking` · Table: `bookings` · Events: **Insert**
   - Type: **Supabase Edge Function** → select `notify-booking`
4. Submit a test booking — the clinic email should arrive within a minute.
   If the Resend key isn't set, the function just logs and skips; bookings are never affected.

## Local development

```
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev            # http://localhost:5173
npm run build          # production build → dist/
```

## Security notes

- No secrets in the repo — all keys come from environment variables / GitHub secrets
- Insurance photos live in a **private** bucket; the public site can only upload, never list or view
- Patient rows are readable only by authenticated staff; the public availability function returns start times only, no names or details
- If a booking insert fails after the photo upload, the orphaned photo stays in the bucket — staff can delete it from **Storage → insurance-cards** in the dashboard

## Project layout

```
src/
  main.jsx  App.jsx  styles.css
  lib/      supabase.js  schedule.js  validate.js
  pages/    Landing.jsx  Schedule.jsx  Book.jsx  Admin.jsx
supabase/
  schema.sql                        ← paste into Supabase SQL editor
  functions/notify-booking/index.ts ← edge function (Resend email)
.github/workflows/deploy.yml       ← build + GitHub Pages deploy
```
