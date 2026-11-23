# Deployment & Operations Guide — Studentmapping GIS

This guide covers running **Studentmapping GIS** locally on MySQL 8.4+/9.x and shipping it cleanly to a staging or production host with zero downtime.

---

## 1. Local Development (MySQL Latest)

### Prerequisites
- **Node.js 20 LTS**
- **MySQL 8.4 LTS or 9.x** running locally on port `3306`

### Setup
1. Copy `.env.example` to `.env` and fill in your local `MYSQL_URL` and strong `SESSION_SECRET` / `ENCRYPTION_KEY`.
2. Create the database if it doesn't exist:
   ```sql
   CREATE DATABASE IF NOT EXISTS student_mapping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Push the Drizzle MySQL schema (safe, non-destructive):
   ```bash
   npm run db:mysql:push
   ```
4. Seed the initial admin account (requires `ADMIN_SEED_PASSWORD` in `.env`):
   ```bash
   npx tsx server/seedAdmin.ts
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

---

## 2. Recommended Production Hosting, Compute & Cost Guardrails

For **500–2,000 active users** (students, non-student portal referrers, and admin staff) on a **low-cost starter tier**:

| Component | Recommended Option (VPS + Docker) | Managed PaaS Alternative | Est. Monthly Cost |
| :--- | :--- | :--- | :--- |
| **App + Reverse Proxy** | 2 vCPU / 4 GB RAM VPS (Hetzner CPX21, DigitalOcean, or Lightsail) running Docker Compose + Caddy/Nginx TLS | Railway / Render Web Service (1 vCPU, 1–2 GB RAM) | \$8–\$15/mo |
| **Database** | MySQL 8.4 LTS container with named volume + automated daily offsite `mysqldump` | Managed MySQL 8 (Railway MySQL, DigitalOcean Managed DB, or Aiven Starter) | \$0 (on VPS) or \$10–\$15/mo |
| **Cache** | Redis 7 Alpine (`maxmemory 256mb`, `allkeys-lru`) | Upstash Redis Free/Starter | \$0–\$5/mo |
| **Uploads / Storage** | Ephemeral temp uploads are immediately deleted after Excel/CSV parsing; for persistent exports/backups, use **Cloudflare R2** (10 GB free) or **Backblaze B2** | Cloudflare R2 / S3 | \$0–\$2/mo |

### Cost Guardrails
- **Google Maps API:** Restrict `VITE_GOOGLE_MAPS_API_KEY` by HTTP referrer (`https://gis.yourdomain.edu.ph/*`), restrict `GOOGLE_MAPS_API_KEY` by server IP, and set a **daily quota cap & billing alert** in Google Cloud Console (e.g., \$10/month alert). Prefer Leaflet + OpenStreetMap as the default map tile provider to stay at \$0/month.
- **Database Connections:** Cap MySQL `max_connections` (150 on VPS) and configure application pool limits via env vars (tuned in Pillar 4).
- **Log Retention:** Rotate Docker JSON logs (`max-size: 10m`, `max-file: 3`) so disk space cannot fill up.

---

## 3. Zero-Downtime Deployment Workflow (Docker Compose)

### First-Time Server Provisioning
1. Copy `.env.production.example` to `.env` on the server and generate cryptographically random secrets:
   ```bash
   node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
   node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Start the stack:
   ```bash
   docker compose up -d --build
   ```
3. Place **Caddy** or **Nginx** in front of `127.0.0.1:5000` for automatic Let's Encrypt HTTPS/TLS termination.

### Safe Zero-Downtime Release Steps
1. **Pull latest verified `main` commit** (after GitHub Actions CI passes):
   ```bash
   git pull origin main
   ```
2. **Back up MySQL before any schema migration:**
   ```bash
   docker exec studentmapping_mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" student_mapping > backup_$(date +%Y%m%d_%H%M%S).sql
   ```
3. **Apply additive-only Drizzle MySQL migrations** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN`, `ADD INDEX` — never drop columns in the same release as code changes):
   ```bash
   npm run db:mysql:generate
   npm run db:mysql:push
   ```
4. **Build the new image before swapping the container** (minimizes downtime to <2 seconds):
   ```bash
   docker compose build app
   docker compose up -d --no-deps app
   ```
5. **Verify healthcheck:**
   ```bash
   curl -fsS http://127.0.0.1:5000/api/test
   ```

---

## 4. Safe Migration & Version Control Rules
- **Never commit PII or secrets:** `.env*` (except `*.example`), `server/uploads/`, `*.xlsx`, and SQL dumps are excluded in `.gitignore`.
- **Two-step destructive migrations:** If a column must be removed, deploy code that stops reading/writing it first, then drop the column in a subsequent migration after verifying backups.
- **CI Gate:** Every pull request and push to `main` automatically runs TypeScript checking, production build verification, and the Pillar 1 security test suite via `.github/workflows/ci.yml`.
