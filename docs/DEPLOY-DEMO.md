# AurumTrace — Free Hosted Demo Runbook

Goal: a shareable, **open (no-login) demo** at **https://app.aurumtrace.com**, backed
by a free Supabase database and a free Render API — **$0/month**.

> ⚠️ **This is a demo with FAKE data.** It runs in `DEMO_MODE`: anyone with the link
> sees one shared demo tenant, no password. A gold "DEMO — sample data" banner shows
> on every screen. **Do not enter any real customer data.** `DEMO_MODE` is **not** the
> real login and must be turned OFF before a real pilot (see the last section).

You'll set up **4 free accounts** and add **2 DNS records** at GoDaddy. Do the steps
**in order** — later steps need values from earlier ones.

---

## What connects to what
```
Visitor ─▶ app.aurumtrace.com  (Vercel — the website)
                 │  server-to-server
                 ▼
           api.aurumtrace.com  (Render — the API / "brain")
                 │
                 ▼
           Supabase Postgres   (the database, with RLS)
```

---

## Step 0 — Put the code on GitHub (one time)
Render and Vercel deploy from a Git repo.
1. Create a **free GitHub account** if you don't have one.
2. Create a new **private** repository (e.g. `aurumtrace`).
3. Push this project to it. From the project folder:
   ```
   cd "/Users/jisanpolara/E-Web Projects/aurumtrace"
   git init && git add -A && git commit -m "AurumTrace Phase 1"
   git branch -M main
   git remote add origin https://github.com/<your-username>/aurumtrace.git
   git push -u origin main
   ```

---

## Step 1 — Database → Supabase (free)
1. Go to **supabase.com** → sign up → **New project**.
2. Name it `aurumtrace-demo`, set a strong **database password** (save it), pick the
   **region closest to the UAE** offered, and create it (takes ~2 min).
3. Load the schema + demo data:
   - Left sidebar → **SQL Editor** → **New query**.
   - Open the file **`packages/db/deploy/all.sql`** from this project, copy **all** of
     it, paste into the editor, click **Run**. It should finish with "Success".
     *(This creates every table, the tenant-isolation rules, and a fictional demo
     tenant + sample case.)*
4. Collect two values (you'll paste them into Render in Step 2):
   - **Database URL** → top bar **Connect** button → **Session pooler** tab → copy the
     URI (starts `postgresql://postgres.<ref>:...@...pooler.supabase.com:5432/postgres`).
     Put your database password in place of `[YOUR-PASSWORD]`.
     ⚠️ Use the **Session pooler** one (port 5432) — not Transaction pooler.
   - **JWT secret** → **Project Settings** → **API** → **JWT Settings** → copy
     **JWT Secret**. *(Not used for login in demo mode, but the API requires it to
     boot.)*

---

## Step 2 — API → Render (free)
1. Go to **render.com** → sign up with GitHub.
2. **New +** → **Blueprint** → pick your `aurumtrace` repo. Render reads
   **`render.yaml`** and proposes the `aurumtrace-api` service. Click **Apply**.
3. It will ask for the 3 secret values (marked "sync: false"). Enter:
   - `DATABASE_URL` → the Supabase **Session pooler** URI from Step 1.
   - `SUPABASE_JWT_SECRET` → the JWT secret from Step 1.
   - `DOCUMENTS_ENC_KEY` → generate one in your terminal and paste it:
     ```
     openssl rand -base64 32
     ```
4. Deploy. When it's live, note the URL, e.g. `https://aurumtrace-api.onrender.com`.
5. Test it: open `https://aurumtrace-api.onrender.com/health` — you should see
   `{"status":"ok","demo":true,...}`.

*(Free Render services sleep after ~15 min idle; the first hit then takes ~50s.
Step 5 adds a keep-alive so demos start fast.)*

---

## Step 3 — Website → Vercel (free)
1. Go to **vercel.com** → sign up with GitHub → **Add New… → Project** → import
   your `aurumtrace` repo.
2. **Root Directory**: click **Edit** and set it to **`apps/web`**. Framework should
   auto-detect **Next.js**.
3. **Environment Variables** — add these two:
   | Name | Value |
   |------|-------|
   | `DEMO_MODE` | `1` |
   | `NEXT_PUBLIC_API_URL` | `https://aurumtrace-api.onrender.com` *(your Render URL for now)* |
4. **Deploy**. When done, open the `*.vercel.app` link — you should see the AurumTrace
   sign-in is **skipped**, the dashboard loads with the gold **DEMO** banner, and the
   sample case is visible. 🎉 That's a working shared demo already.

---

## Step 4 — Point aurumtrace.com at it (GoDaddy DNS)
Now swap the platform URLs for your domain. Two subdomains, two CNAME records.

**4a. Website → app.aurumtrace.com (Vercel)**
1. Vercel project → **Settings → Domains** → add `app.aurumtrace.com`. Vercel shows a
   target like `cname.vercel-dns.com`.
2. GoDaddy → your domain → **DNS → Add record**:
   - Type **CNAME**, Name **`app`**, Value = the Vercel target, Save.

**4b. API → api.aurumtrace.com (Render)**
1. Render service → **Settings → Custom Domains** → add `api.aurumtrace.com`. Render
   shows a CNAME target like `aurumtrace-api.onrender.com`.
2. GoDaddy → **Add record**: Type **CNAME**, Name **`api`**, Value = the Render target,
   Save.

**4c. Tell the website to use the API domain**
- Back in Vercel → **Settings → Environment Variables** → change
  `NEXT_PUBLIC_API_URL` to `https://api.aurumtrace.com` → **Redeploy**.

DNS can take a few minutes to a couple of hours. When ready, both platforms will mark
the domains "Valid / Active" and issue HTTPS certificates automatically.

---

## Step 5 — Keep the demo snappy (optional, free)
So Render doesn't fall asleep before a demo:
1. Go to **cron-job.org** (free) → sign up → **Create cronjob**.
2. URL: `https://api.aurumtrace.com/health`, schedule: **every 10 minutes**. Save.

---

## Done — share the link
**https://app.aurumtrace.com** — anyone can open it, click through all six stages
(intake → KYC → threshold → sourcing → goAML draft → audit), with the DEMO banner
making clear it's sample data.

---

## When you're ready for a real pilot (turn the demo OFF)
`DEMO_MODE` is intentionally not the real login. To move from demo to pilot:
- Render: set `DEMO_MODE=false`, keep `AUTH_DEV_MODE=false`.
- Wire real **Supabase Auth** in the web app (the deferred launch item) so each user
  logs in and their `tenant_id` + `role` ride in the JWT.
- Complete the 🔒 items in [PILOT-READINESS.md](PILOT-READINESS.md): in-region DB, a
  non-`BYPASSRLS` role, KMS-managed `DOCUMENTS_ENC_KEY`, real providers, and the
  compliance-advisor sign-offs. See also the free-vs-paid guidance for going live.
```
Demo:  DEMO_MODE=true   (open, shared tenant, fake data)
Pilot: DEMO_MODE=false + real Supabase Auth + advisor sign-offs
```
