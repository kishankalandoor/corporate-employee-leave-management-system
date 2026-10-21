# Deployment & Operations Guide
## Leave Management System (LMS) — Exelon Circuits Pvt. Ltd.

---

### 1. Prerequisites

- **Docker**: Engine version 24+ or Docker Desktop
- **Docker Compose**: Compose v2+
- **Host Ports**:
  - `80`: Web Application Reverse Proxy (Default HTTP)
  - `3000`: Grafana Observability Dashboard
  - `9090`: Prometheus Metrics Server

---

### 2. Quickstart Execution

```bash
# 1. Clone repository
cd "Leave Management System"

# 2. Inspect environment configuration
cp .env.example .env

# 3. Build & start all containers in background
docker compose up --build -d

# 4. Verify container health status
docker compose ps
```

The application is accessible immediately at:
- **Web Application Portal**: [http://localhost](http://localhost)
- **Grafana Observability**: [http://localhost:3000](http://localhost:3000) (User: `admin`, Pass: `admin`)
- **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)

---

### 3. Container Services Architecture

| Service | Container Name | Internal Port | Exposed Host Port | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| `nginx` | `lms-nginx-proxy` | 80 | `80:80` | `wget http://localhost/nginx-health` |
| `frontend` | `lms-frontend` | 80 | None (Internal) | `wget http://localhost/` |
| `backend` | `lms-backend` | 4000 | None (Internal) | `curl http://localhost:4000/api/health` |
| `mongodb` | `lms-mongodb` | 27017 | None (Internal) | `mongosh db.adminCommand('ping')` |
| `prometheus` | `lms-prometheus` | 9090 | `9090:9090` | `wget http://localhost:9090/-/healthy` |
| `grafana` | `lms-grafana` | 3000 | `3000:3000` | `wget http://localhost:3000/api/health` |
| `loki` | `lms-loki` | 3100 | None (Internal) | `wget http://localhost:3100/ready` |
| `alloy` | `lms-alloy` | 12345 | None (Internal) | Process check |

---

### 4. Database Seeding, Backup & Restore

#### Idempotent Seed Execution
The backend automatically executes the seed script on first boot if `SEED_DEMO_DATA=true`. You can also trigger it manually:
```bash
docker compose exec backend node -e "import('./dist/database/seed.js')"
```

#### Database Backup
```bash
docker compose exec mongodb mongodump --db leave_management --out /data/db/backup_$(date +%Y%m%d)
```

#### Database Restore
```bash
docker compose exec mongodb mongorestore --db leave_management /data/db/backup_YYYYMMDD/leave_management
```

---

### 5. Common Operational Commands

```bash
# View aggregated real-time logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Restart backend service without stopping database
docker compose restart backend

# Stop entire application
docker compose down

# Stop and wipe persistent volumes (CAUTION: erases database)
docker compose down -v
```
