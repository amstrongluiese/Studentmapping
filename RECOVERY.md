# Disaster Recovery & Rollback Runbook — Studentmapping GIS

This runbook documents exact procedures for health diagnostics, database backups/restores, and deployment rollbacks.

---

## 1. Health & Readiness Diagnostics

| Endpoint | Purpose | Expected Healthy Response |
| :--- | :--- | :--- |
| `GET /health` (or `/api/health`) | Liveness probe (app process, uptime, cache & queue stats) | `200 OK` `{ "status": "ok", ... }` |
| `GET /ready` (or `/api/ready`) | Readiness probe (executes `SELECT 1` against MySQL pool) | `200 OK` `{ "status": "ready", "checks": { "database": { "status": "up" } } }` |

- If `/ready` returns `503 Service Unavailable`, inspect structured JSON logs (`X-Request-Id`) and verify MySQL is running and accepting connections (`MYSQL_URL`).

---

## 2. Automated Database Backups

### Windows (Local MySQL)
```powershell
.\scripts\backup_mysql.ps1 -BackupDir ".\backups" -RetentionDays 14
```

### Linux / Docker VPS (Recommended Daily Cron at 02:00)
```bash
chmod +x scripts/backup_mysql.sh
./scripts/backup_mysql.sh
```
> **Offsite Rule (3-2-1):** Sync `./backups/*.sql.gz` nightly to Cloudflare R2 / S3 / Backblaze B2 (`rclone copy ./backups r2:studentmapping-backups`) so backups survive host disk failure.

---

## 3. Database Restore Procedure

> **Warning:** Always take a safety snapshot of the current database before restoring over it.

### Local MySQL (Windows PowerShell)
```powershell
# 1. Safety snapshot first
.\scripts\backup_mysql.ps1

# 2. Restore chosen backup file
$env:MYSQL_PWD = "YOUR_MYSQL_PASSWORD"
Get-Content .\backups\backup_student_mapping_YYYYMMDD_HHMMSS.sql | mysql -h localhost -u root student_mapping
Remove-Item Env:MYSQL_PWD
```

### Docker Compose (Linux VPS)
```bash
# 1. Stop the app container briefly to prevent concurrent writes during restore
docker compose stop app

# 2. Restore compressed dump into MySQL container
gunzip -c ./backups/backup_student_mapping_YYYYMMDD_HHMMSS.sql.gz \
  | docker exec -i -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" studentmapping_mysql mysql -u root student_mapping

# 3. Restart the app and verify readiness
docker compose start app
curl -fsS http://127.0.0.1:5000/ready
```

---

## 4. Deployment Rollback Procedure

If a new release introduces a regression or fails `/ready`:

### Option A: Git + Docker Compose Rollback
```bash
# 1. Identify the previous known-good commit
git log -n 5 --oneline

# 2. Checkout the previous known-good commit (non-destructive)
git checkout <GOOD_COMMIT_SHA>

# 3. Rebuild and swap only the app container
docker compose build app
docker compose up -d --no-deps app

# 4. Verify readiness
curl -fsS http://127.0.0.1:5000/ready
```

### Option B: Emergency Secret Rotation
If `SESSION_SECRET` or `ENCRYPTION_KEY` is ever compromised:
1. Generate a new 64-char hex secret (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
2. Update `.env` on the host and restart `app` (`docker compose up -d --force-recreate app`).
3. Rotating `SESSION_SECRET` immediately invalidates all active sessions (users will simply log in again).
4. If rotating `ENCRYPTION_KEY`, decrypt any `enc:`-prefixed columns with the old key and re-encrypt with the new key before removing the old key.
