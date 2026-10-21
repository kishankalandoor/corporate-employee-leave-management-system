# Deployment & Operations Guide
## Leave Management System (LMS) — Exelon Circuits Pvt. Ltd.

---

### 1. Prerequisites

- **Docker**: Engine version 24+ or Docker Desktop
- **Docker Compose**: Compose v2.29+
- **Host Ports**:
  - `80`: Web Application Reverse Proxy (Default HTTP Ingress)
  - `3200`: Grafana Observability Dashboard (`http://localhost:3200/grafana/` or `http://localhost/grafana/`)
  - `9090`: Prometheus Metrics Server

---

### 2. Quickstart Execution

#### Step 1: Clone Repository & Verify Environment
```bash
cd "Leave Management System"
cp .env.example .env
```

#### Step 2: Build & Start All Containers
```bash
docker compose up -d
```

![Docker Compose Up](images/docker/docker-compose-up.png)

#### Step 3: Verify Container Health Status
```bash
docker ps
```

![Docker Services Healthy](images/docker/docker-services-healthy.png)

The application is accessible immediately at:
- **Web Application Portal**: [http://localhost](http://localhost) (Served on port 80 via Nginx Ingress)
- **Grafana Observability**: [http://localhost:3200/grafana/](http://localhost:3200/grafana/) or [http://localhost/grafana/](http://localhost/grafana/) (User: `admin`, Pass: `admin`)
- **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)

---

### 3. Container Services Architecture

| Service | Container Name | Internal Port | Exposed Host Port | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| `nginx` | `lms-nginx-proxy` | 80 | `80:80` | `wget -qO- http://localhost/nginx-health` |
| `frontend` | `lms-frontend` | 80 | None (Internal) | `wget -qO- http://localhost/` |
| `backend` | `lms-backend` | 4000 | None (Internal) | `curl -f http://localhost:4000/api/health` |
| `mongodb` | `lms-mongodb` | 27017 | None (Internal) | `mongosh db.adminCommand('ping')` |
| `prometheus` | `lms-prometheus` | 9090 | `9090:9090` | `wget -qO- http://localhost:9090/-/healthy` |
| `grafana` | `lms-grafana` | 3000 | `3200:3000` | `wget -qO- http://localhost:3000/api/health` |
| `loki` | `lms-loki` | 3100 | None (Internal) | `wget -qO- http://localhost:3100/ready` |
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
# View aggregated real-time logs across all services
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Restart backend service without stopping database
docker compose restart backend

# Restart Nginx ingress proxy
docker compose restart nginx

# Stop entire application
docker compose down

# Stop and wipe persistent volumes (CAUTION: erases database)
docker compose down -v
```

---

*Leave Management System — Exelon Circuits Pvt. Ltd.*
