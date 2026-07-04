# VPS Docker Deployment

This deployment runs three containers:

- `frontend`: Nginx serving the built React/Vite app and proxying `/api` to the backend.
- `backend`: Express API on port `5000`.
- `mongo`: private MongoDB container with persistent data.

The public domain is:

```text
https://accounts.afchittagong.org
```

## 1. Point The Domain

Create or update the DNS record:

```text
Type: A
Host: accounts
Value: YOUR_VPS_PUBLIC_IP
```

Wait until it resolves:

```bash
dig accounts.afchittagong.org
```

## 2. Put The Project On The VPS

Use any path you prefer. A common path is:

```bash
sudo mkdir -p /opt/alliance-accounting-app
sudo chown -R $USER:$USER /opt/alliance-accounting-app
cd /opt/alliance-accounting-app
```

Then clone or upload this project into that directory.

## 3. Create Production Env File

```bash
cp backend/.env.production.example backend/.env.production
nano backend/.env.production
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

## 4. Build And Start

From the project root:

```bash
docker compose build
docker compose up -d
```

Check status:

```bash
docker compose ps
docker compose logs -f backend
```

The frontend container is available on the VPS only at:

```text
http://127.0.0.1:8088
```

That avoids conflicts with existing projects using ports `80` and `443`.

## 5. Seed The First Director User

For a fresh database, add these values to `backend/.env.production` first:

```bash
SEED_ADMIN_EMAIL=director@example.com
SEED_ADMIN_PASSWORD=replace-with-a-strong-password
```

Then run:

```bash
docker compose exec backend npm run seed
```

After seeding, you can remove `SEED_ADMIN_PASSWORD` from `backend/.env.production` and restart:

```bash
docker compose restart backend
```

## 6. Configure Host Nginx Reverse Proxy

Copy the example config:

```bash
sudo cp deploy/nginx/accounts.afchittagong.org.conf /etc/nginx/sites-available/accounts.afchittagong.org
sudo ln -s /etc/nginx/sites-available/accounts.afchittagong.org /etc/nginx/sites-enabled/accounts.afchittagong.org
sudo nginx -t
sudo systemctl reload nginx
```

If another project already uses Nginx, keep its config as-is and add this as a separate server block for `accounts.afchittagong.org`.

## 7. Enable HTTPS

Use Certbot with Nginx:

```bash
sudo certbot --nginx -d accounts.afchittagong.org
```

After HTTPS is active, visit:

```text
https://accounts.afchittagong.org
```

## 8. Useful Operations

Restart:

```bash
docker compose restart
```

Update after pulling new code:

```bash
docker compose build
docker compose up -d
```

View logs:

```bash
docker compose logs -f
```

Stop:

```bash
docker compose down
```

Backup MongoDB:

```bash
docker compose exec mongo mongodump --archive=/data/db/accounts-backup.archive
docker cp alliance-accounting-mongo-1:/data/db/accounts-backup.archive ./accounts-backup.archive
```

## Notes For Docker-Based Reverse Proxies

If your existing `gamerskit` setup uses Nginx Proxy Manager, Traefik, or another reverse proxy inside Docker instead of host Nginx, you have two common options:

1. Change the frontend port mapping in `docker-compose.yml` from `127.0.0.1:8088:80` to `8088:80`, then proxy to `http://YOUR_VPS_IP:8088`.
2. Attach the `frontend` service to the same external Docker network as your reverse proxy, then proxy to `http://frontend:80`.

Keep public traffic HTTPS. The backend sets secure cookies in production, so login will only work reliably through `https://accounts.afchittagong.org`.
