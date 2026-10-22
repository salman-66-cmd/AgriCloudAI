# AgriCloud — Cloud Deployment & DevOps Guide

## 1. Local Containerized Deployment (Docker Compose)

The fastest way to deploy the entire production stack locally with PostgreSQL is via Docker Compose:

```bash
# 1. Start all services in the background
docker compose up -d --build

# 2. Verify container statuses
docker compose ps

# 3. View application logs
docker compose logs -f api

# 4. Shut down stack
docker compose down
```

Local Container Access URLs:
- **Web Dashboard**: `http://localhost:80`
- **Backend API**: `http://localhost:5000/api/v1`
- **Swagger Documentation**: `http://localhost:5000/api-docs`
- **PostgreSQL Database**: `localhost:5432`

---

## 2. Low-Cost / Free-Tier Cloud Deployment Guide

### Option A: Railway.app / Render (Recommended for Students)

1. **Managed PostgreSQL**:
   - Create a free project on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
   - Copy your PostgreSQL connection URL: `postgresql://user:pass@ep-xxxx.neon.tech/agricloud?sslmode=require`.

2. **Deploy Backend API**:
   - Connect your GitHub repository to [Render](https://render.com) or [Railway](https://railway.app).
   - Set Root Directory: `.`
   - Build Command: `npm install && npm run build --workspace=packages/shared && npx prisma generate --schema=prisma/schema.postgresql.prisma && npm run build --workspace=apps/api`
   - Start Command: `node apps/api/dist/index.js`
   - Configure Environment Variables:
     - `DATABASE_URL`: Your Neon/Supabase connection string
     - `JWT_ACCESS_SECRET`: Secure random 32-character string
     - `JWT_REFRESH_SECRET`: Secure random 32-character string
     - `NODE_ENV`: `production`
     - `CORS_ORIGIN`: Your frontend URL

3. **Deploy Frontend Web Application**:
   - Create a Static Site on Render or Vercel.
   - Root Directory: `.`
   - Build Command: `npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/web`
   - Publish Directory: `apps/web/dist`

---

## 3. Database Backup & Restore Procedures

### PostgreSQL Backup
```bash
pg_dump -h localhost -U agricloud_user -d agricloud_db -F c -b -v -f agricloud_backup.dump
```

### PostgreSQL Restore
```bash
pg_restore -h localhost -U agricloud_user -d agricloud_db -v agricloud_backup.dump
```

### SQLite Local Backup
Simply copy `agricloud.db` to a backup location:
```bash
copy agricloud.db agricloud_backup.db
```
