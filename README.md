# PhD Command — setup (≈10 minutes total)

Three files: `index.html` (the app), `data.js` (all 51 universities + 138 professors + deadlines), `worker.js` (sync backend).

## Part 1 — GitHub Pages (the site)

1. Create a new **public** repo, e.g. `phd-command` (or `<username>.github.io` if you want the root domain).
2. Upload `index.html` and `data.js` to the repo root.
3. Repo → Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save.
4. Wait ~1 minute. Site is live at `https://<username>.github.io/phd-command/`.

The site fully works at this point — but each device keeps its own data.

## Part 2 — Cloudflare Worker (the sync) — same pattern as your ECCV navigator

1. dash.cloudflare.com → **Workers & Pages** → Create → **Worker** → name it `phd-sync` → Deploy the hello-world, then **Edit code** → replace everything with `worker.js` → Deploy.
2. Worker → **Settings → Bindings → Add binding → KV Namespace**:
   - Variable name: `PHD_KV` (must be exactly this)
   - Namespace: create new, any name (e.g. `phd-kv`)
3. Worker → **Settings → Variables and Secrets → Add → Secret**:
   - Name: `SECRET_TOKEN` (exactly this)
   - Value: invent a long random string (e.g. from a password generator). Save it somewhere.
4. Copy the worker URL: `https://phd-sync.<your-subdomain>.workers.dev`

## Part 3 — connect (once per device)

Open the site → tap **⚙** → paste Worker URL + your token → **Save & sync now**.
Do the same on your phone. From then on, every tap syncs automatically
(green dot = synced, amber = local-only, red = check settings).

## Daily use

- **Today** — deadline departures board, counters, overdue follow-ups (14+ days silent).
- **Schools** — priority order, continent colors, tap to expand: location notes, fit, professors, school notes.
- **People** — all 138, filterable (Recruiting / Visiting route / Do-not-email / Form / region) + full-text search.
- **Dates** — every tracked deadline with countdowns. Reverify on official pages before submitting.
- On each professor: tap **Emailed / Replied / Interview / Offer / No-Rej** to log progress (date auto-stamped, tap again to undo one step). Notes autosave.
- ⚙ → **Export backup** downloads your tracking state as JSON whenever you want a snapshot.

## Safety notes

- Your research data (statements, deadlines) lives in `data.js` in the repo — never lost even if the Worker dies.
- Your tracking state lives in KV + localStorage; export backups occasionally.
- The repo is public, so `data.js` is public. It contains only professor/university research info — your personal tracking (who you emailed, notes) is NOT in the repo; it lives only in your KV store behind your token. If you'd rather keep even the research data private, make the repo private and use Cloudflare Pages (free) instead of GitHub Pages — the same two files work unchanged.
