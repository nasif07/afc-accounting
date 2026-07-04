# VPS Docker Deployment

This deployment runs three containers:

- `frontend`: Nginx serving the built React/Vite app and proxying `/api` to the backend. Published on the VPS at `127.0.0.1:4800`.
- `backend`: Express API. Published on the VPS at `127.0.0.1:4802`.
- `mongo`: private MongoDB container with persistent data.

Images are built on your dev machine, pushed to Docker Hub under the `nasi07`
namespace, and pulled on the VPS — the VPS never needs the source repo, only
`docker-compose.prod.yml` + an env file + the nginx config below.

The public domain is:

```text
https://accounts.afchittagong.org
```

## 1. Point The Domain

Create or update the DNS record:

```text
Type: A
Host: accounts
Value: 187.127.177.101
```

Wait until it resolves:

```bash
dig accounts.afchittagong.org
```

## 2. Build And Push The Images (on your dev machine)

From the project root, logged into Docker Hub (`docker login`):

```bash
docker compose build
docker compose push
```

This builds and pushes `nasi07/alliance-accounting-frontend:latest` and
`nasi07/alliance-accounting-backend:latest` (see the `image:` fields in
`docker-compose.yml`). Re-run these two commands after every change you want
to ship — there's no separate "tag" step needed for `:latest`; give the
`image:` field a real version tag (e.g. `:1.1.0`) instead of `:latest` once
you want reproducible rollbacks.

## 3. Put The Deploy Files On The VPS

The VPS only needs three things, not the full repo. Pick any path:

```bash
sudo mkdir -p /opt/alliance-accounting-app
sudo chown -R $USER:$USER /opt/alliance-accounting-app
cd /opt/alliance-accounting-app
```

Copy from your dev machine (run this locally, not on the VPS):

```bash
scp docker-compose.prod.yml YOUR_USER@187.127.177.101:/opt/alliance-accounting-app/
scp backend/.env.production.example YOUR_USER@187.127.177.101:/opt/alliance-accounting-app/.env.production
scp deploy/nginx/accounts.afchittagong.org.conf YOUR_USER@187.127.177.101:/tmp/
```

## 4. Create Production Env File

Back on the VPS:

```bash
cd /opt/alliance-accounting-app
nano .env.production
```

Set at least:

```bash
MONGODB_URI=mongodb://mongo:27017/alliance_accounting
JWT_SECRET=replace-with-a-real-secret
CORS_ORIGIN=https://accounts.afchittagong.org
```

Generate a strong JWT secret:

```bash
openssl rand -hex 32
```

Paste that output into `JWT_SECRET`.

## 5. Pull And Start

From `/opt/alliance-accounting-app` on the VPS:

```bash
docker login
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

The frontend and backend are published on the VPS only, at:

```text
http://127.0.0.1:4800   (frontend)
http://127.0.0.1:4802   (backend API, direct — most requests still go through
                          the frontend's own /api proxy on the same origin)
```

Both are loopback-only (`127.0.0.1:`), matching this repo's existing pattern —
they are not reachable from the public internet directly, only via the host
Nginx reverse proxy set up in step 7. If you deliberately want the backend
reachable directly from outside on `4802` (e.g. a separate mobile client),
change `127.0.0.1:4802:5000` to `4802:5000` in `docker-compose.prod.yml` and
open port 4802 in your firewall — but note that's plain HTTP with no TLS, so
prefer routing it through the reverse proxy with its own `server_name`/path
instead if you can.

## 6. Seed The First Director User

For a fresh database, add these values to `.env.production` on the VPS first:

```bash
SEED_ADMIN_EMAIL=director@example.com
SEED_ADMIN_PASSWORD=replace-with-a-strong-password
```

Then run:

```bash
docker compose -f docker-compose.prod.yml up -d backend   # picks up the env change
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

After seeding, remove `SEED_ADMIN_PASSWORD` from `.env.production` and restart:

```bash
docker compose -f docker-compose.prod.yml restart backend
```

## 7. Configure Host Nginx Reverse Proxy

You copied `accounts.afchittagong.org.conf` to `/tmp/` in step 3. Install it:

```bash
sudo mv /tmp/accounts.afchittagong.org.conf /etc/nginx/sites-available/accounts.afchittagong.org
sudo ln -s /etc/nginx/sites-available/accounts.afchittagong.org /etc/nginx/sites-enabled/accounts.afchittagong.org
sudo nginx -t
sudo systemctl reload nginx
```

If another project already uses Nginx, keep its config as-is and add this as a separate server block for `accounts.afchittagong.org`.

## 8. Enable HTTPS

Use Certbot with Nginx:

```bash
sudo certbot --nginx -d accounts.afchittagong.org
```

After HTTPS is active, visit:

```text
https://accounts.afchittagong.org
```

## 9. Useful Operations

Run all of these from `/opt/alliance-accounting-app` on the VPS.

Restart:

```bash
docker compose -f docker-compose.prod.yml restart
```

Update after pushing new images from your dev machine:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

View logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Stop:

```bash
docker compose -f docker-compose.prod.yml down
```

Backup MongoDB:

```bash
docker compose -f docker-compose.prod.yml exec mongo mongodump --archive=/data/db/accounts-backup.archive
docker cp alliance-accounting-mongo-1:/data/db/accounts-backup.archive ./accounts-backup.archive
```

## Notes For Docker-Based Reverse Proxies

If your existing `gamerskit` setup uses Nginx Proxy Manager, Traefik, or another reverse proxy inside Docker instead of host Nginx, you have two common options:

1. Change the frontend port mapping in `docker-compose.prod.yml` from `127.0.0.1:4800:80` to `4800:80`, then proxy to `http://187.127.177.101:4800`.
2. Attach the `frontend` service to the same external Docker network as your reverse proxy, then proxy to `http://frontend:80`.

Keep public traffic HTTPS. The backend sets secure cookies in production, so login will only work reliably through `https://accounts.afchittagong.org`.
