# Deployment Runbook — accounts.afchittagong.org

This is a record of what's actually running in production, plus the exact
steps for redeploying after a code change. `DEPLOYMENT.md` is the general
first-time setup guide; this file is the day-to-day reference for *this*
specific VPS, once everything below has already been done once.

## 1. Architecture — what's running, and why

```
                         Internet
                            │
                            ▼
              Hostinger VPS (187.127.177.101)
              ┌─────────────────────────────────────────┐
              │  Nginx (host-level, serves other sites   │
              │  too — this app is one server block      │
              │  among several)                          │
              │    accounts.afchittagong.org (443, TLS)  │
              │            │                              │
              │            ▼                              │
              │      127.0.0.1:4800 ──► frontend container│
              │      127.0.0.1:4802 ──► backend container │
              │                                            │
              │  Docker network "accounts_net"            │
              │  ┌──────────┐  ┌─────────┐  ┌───────────┐│
              │  │ frontend │  │ backend │  │   mongo   ││
              │  │ (nginx,  │─►│(express,│─►│  (mongo:7)││
              │  │  :80)    │  │  :5000) │  │           ││
              │  └──────────┘  └─────────┘  └───────────┘│
              └─────────────────────────────────────────┘
```

**Why images from Docker Hub instead of building on the VPS?** The VPS never
has the source code — it only has `docker-compose.prod.yml` and an env file.
Builds happen on your dev machine (`docker compose build` reads the
Dockerfiles), get pushed to Docker Hub, and the VPS just pulls the finished
image. This keeps the VPS simple (no Node/npm toolchain needed there) and
means a "deploy" is just a pull + container restart, not a build.

**Why is the backend also published on a port (4802)?** By default the
frontend's own Nginx (inside its container) already proxies `/api/*` to the
backend over the internal Docker network — that's how the web app talks to
the API day to day. Port 4802 exists in addition, in case you ever need to
hit the API directly (Postman, a future mobile client, etc.). Both 4800 and
4802 are bound to `127.0.0.1` only — not reachable from the internet, only
from the VPS itself (which is exactly what the host Nginx reverse proxy does,
routing the public domain into them).

## 2. What's where

| What | Location |
|---|---|
| Docker Hub images | `nasi07/alliance-accounting-frontend:latest`, `nasi07/alliance-accounting-backend:latest` |
| Compose file (VPS) | `/opt/apps/afc-accounting/docker-compose.prod.yml` |
| Secrets (VPS, not in git) | `/opt/apps/afc-accounting/.env.production` |
| Nginx site config | `/etc/nginx/sites-available/accounts.afchittagong.org` (symlinked into `sites-enabled/`) |
| TLS certificate | `/etc/letsencrypt/live/accounts.afchittagong.org/` (managed by certbot, auto-renews) |
| Mongo data | Docker named volume `alliance-accounting_mongo_data` — survives container recreation, `docker compose down` (without `-v`), and image updates |
| Uploaded files / generated PDFs | Docker named volume `alliance-accounting_backend_uploads` — same persistence guarantee |

## 3. One-time setup (already done — for reference only)

These steps are **done** and shouldn't need repeating unless you rebuild the
VPS from scratch:

1. Docker Hub images built and pushed from the dev machine (`docker compose build && docker compose push`).
2. DNS: `accounts.afchittagong.org` → `187.127.177.101` (A record).
3. `docker-compose.prod.yml` and `.env.production` created directly on the VPS via the Hostinger browser terminal (no local SSH client involved — files were created with `cat > file <<'EOF' ... EOF` rather than `scp`).
4. `docker compose -f docker-compose.prod.yml pull && up -d` — all three containers came up healthy.
5. First director user seeded via `docker compose -f docker-compose.prod.yml exec backend npm run seed`, then `SEED_ADMIN_PASSWORD` removed from `.env.production` again.
6. New Nginx server block added at `/etc/nginx/sites-available/accounts.afchittagong.org`, proxying to `127.0.0.1:4800`, enabled via a symlink into `sites-enabled/` — added *alongside* the VPS's other existing sites, not replacing anything.
7. HTTPS issued with `sudo certbot --nginx -d accounts.afchittagong.org`. Certbot installed a systemd timer that renews it automatically — nothing to do here going forward unless renewal starts failing (check with `sudo certbot renew --dry-run`).

## 4. Redeploying after a code change

This is the part you'll repeat every time you ship a change. Two halves: dev
machine (build + push), then VPS (pull + recreate).

### 4a. On your dev machine

```bash
cd /path/to/alliance-accounting-app
docker compose build
docker compose push
```

`docker compose build` rebuilds **both** `frontend` and `backend` images from
their Dockerfiles using whatever's currently checked out. `docker compose
push` uploads both to Docker Hub under `nasi07/...`. If you only changed the
frontend (or only the backend), you can scope both commands to just that
service to save time:

```bash
docker compose build frontend   # or: backend
docker compose push frontend    # or: backend
```

**Both commands re-use the `:latest` tag** — see the note in §6 if you want
versioned tags instead (recommended once this app matters enough that you
want the ability to roll back to a specific previous build).

### 4b. On the VPS (Hostinger browser terminal)

```bash
cd /opt/apps/afc-accounting
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

- `pull` fetches whatever images are newer than what's currently running (if
  you only pushed `frontend`, only `frontend` actually downloads anything).
- `up -d` recreates any container whose image changed, and leaves untouched
  containers (e.g. `mongo`, if you only shipped a frontend change) alone.
- **Mongo data and uploaded files are not affected** — they live in the named
  volumes listed in §2, not inside the container filesystem, so recreating
  `backend`/`frontend` never touches them.
- There's a few seconds of downtime while the changed container(s) restart —
  fine for this app's traffic level; not a zero-downtime deploy.

Confirm it worked:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 backend
```

All three should show `healthy`/`running`. Then check
`https://accounts.afchittagong.org` in a browser.

### 4c. What you do *not* need to redo

Nginx config, the TLS certificate, DNS, and the seeded director user are all
one-time — none of them are touched by a normal code-change redeploy. You'd
only revisit those if you changed a *port*, added a *new domain/subdomain*,
or needed a *second* admin account.

## 5. Useful ongoing commands (run on the VPS, from `/opt/apps/afc-accounting`)

```bash
# Live logs, all services
docker compose -f docker-compose.prod.yml logs -f

# Live logs, one service
docker compose -f docker-compose.prod.yml logs -f backend

# Restart everything without pulling new images
docker compose -f docker-compose.prod.yml restart

# Stop everything (data volumes are kept)
docker compose -f docker-compose.prod.yml down

# Back up MongoDB
docker compose -f docker-compose.prod.yml exec mongo mongodump --archive=/data/db/backup.archive
docker cp alliance-accounting-mongo-1:/data/db/backup.archive ./backup-$(date +%F).archive

# Reclaim disk space from old, unused image layers after several redeploys
docker image prune -f
```

## 6. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `docker compose ps` shows `backend` unhealthy | Check `docker compose -f docker-compose.prod.yml logs backend` — usually a bad `MONGODB_URI`/`JWT_SECRET` in `.env.production`, or Mongo not yet healthy when backend started (it should wait automatically via `depends_on: condition: service_healthy`, but check anyway). |
| Site shows Nginx 502 | The `frontend` or `backend` container isn't running/healthy — re-run `docker compose -f docker-compose.prod.yml ps` and check logs. |
| `https://accounts.afchittagong.org` doesn't load at all, but `curl http://127.0.0.1:4800` on the VPS works | Nginx site not enabled, or DNS not pointing here — check `sudo nginx -t`, `ls /etc/nginx/sites-enabled/`, and `dig +short accounts.afchittagong.org`. |
| Certificate expired / browser TLS warning | Run `sudo certbot renew --dry-run` to test renewal, then `sudo certbot renew` for real, then `sudo systemctl reload nginx`. Should never actually be needed — certbot's timer renews automatically well before the 90-day expiry. |
| Login fails after a fresh deploy | Confirm you didn't accidentally wipe the `mongo_data` volume (only happens via `docker compose down -v`, never plain `down` or `up -d`). |

## 7. Security notes

- `.env.production` lives only on the VPS and in your local working copy —
  it's `.gitignore`d and no longer tracked in git. Never `git add` it back.
- If you ever need to rotate `JWT_SECRET` (e.g. suspected leak), generate a
  new one with `openssl rand -hex 32`, update `.env.production` on the VPS,
  and `docker compose -f docker-compose.prod.yml restart backend` — this
  invalidates all existing login sessions, so everyone has to log in again.
- `4800`/`4802` are loopback-only by design (`127.0.0.1:4800:80` in the
  compose file, not bare `4800:80`) — don't change that unless you have a
  specific reason to expose the containers directly to the internet, since
  that would bypass Nginx's TLS termination entirely.

---

*Optional improvement, not required right now:* tagging images with a
version instead of always overwriting `:latest` (e.g.
`nasi07/alliance-accounting-backend:2026-07-05` or a semantic version) lets
you roll back to an exact previous build by changing the tag in
`docker-compose.prod.yml` and re-pulling, instead of only ever being able to
move forward. Worth adopting once this app is handling real production data
you care about not breaking.
