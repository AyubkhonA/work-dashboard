# Deploy — two Netlify sites, one shared backend

The worker uploads on one site; the boss views on another. They share data through a
**Netlify Function + Netlify Blobs** store (no separate database). The backend lives on
the **worker** site; the **boss** site is static and reads from it (CORS is open).

```
 WORKER site  (any name, e.g. ortho-upload.netlify.app)
   /            → upload screen → dashboard
   /.netlify/functions/statement   ← the backend (Blobs store)   ← worker POSTs here

 BOSS site  (advanced-ortho-prem-dashboardview.netlify.app)
   /            → dashboard (read-only), built with VITE_ROLE=boss
                  fetches from the WORKER site's function (VITE_API_BASE)
```

---

## Easiest: Netlify CLI (one login, then two deploys)

From the project root (`/Users/khan/work-dashboard`):

```bash
# 0) one-time login (opens your browser — click Authorize)
npx netlify-cli login

# 1) WORKER site (+ backend). Creates the site and deploys functions + static.
npx netlify-cli deploy --build --prod
#    → when asked, "Create & configure a new site", name it e.g.  ortho-upload
#    → note the live URL it prints, e.g.  https://ortho-upload.netlify.app

# 2) BOSS site. Create a second site that points at the worker's backend.
npx netlify-cli sites:create --name advanced-ortho-prem-dashboardview
npx netlify-cli env:set VITE_ROLE boss --context production
npx netlify-cli env:set VITE_API_BASE https://ortho-upload.netlify.app --context production
npx netlify-cli deploy --build --prod
```

(If a name is taken, Netlify appends a suffix — adjust as needed.)

---

## Or: connect a Git repo (auto-deploy)

1. Push this repo to GitHub.
2. Netlify → **Add new site → Import from Git** → pick the repo. The `netlify.toml` is
   auto-detected (build `cd client && npm install && npm run build`, publish `client/dist`,
   functions `netlify/functions`). Deploy → this is the **worker** site. Rename it as you like.
3. **Add new site** again from the same repo → this is the **boss** site. In its
   **Site settings → Environment variables** add:
   - `VITE_ROLE = boss`
   - `VITE_API_BASE = https://<worker-site>.netlify.app`
   Rename the site to `advanced-ortho-prem-dashboardview`. Trigger a deploy.

---

## How the data flows

- Worker opens the worker site, uploads the 3 files → parsed in-browser → `POST` to the
  function → stored in Blobs (keyed by month).
- Boss opens the boss site → `GET` the latest statement from the worker site's function →
  renders. Refreshes show the newest upload.
- Offline/local: if the function is unreachable, both fall back to `localStorage`.

## Env vars (summary)

| Var | Worker site | Boss site |
|---|---|---|
| `VITE_ROLE` | _(unset)_ | `boss` |
| `VITE_API_BASE` | _(unset → same-origin)_ | `https://<worker-site>.netlify.app` |
