# Architecture & System Design Document
## Leave Management System (LMS) — Exelon Circuits Pvt. Ltd.

---

### 1. High-Level Architecture Diagram

```mermaid
graph TD
    Client[Browser / User Agent] -->|Port 80 HTTP| Nginx[Nginx Reverse Proxy Ingress]
    
    subgraph Container Orchestration Network (lms_network)
        Nginx -->|/ Static Assets & SPA Fallback| Frontend[Frontend React 18 + Vite Static Server]
        Nginx -->|/api/* REST Endpoints| Backend[Backend Express + TypeScript API :4000]
        Nginx -->|/grafana/* Subpath Proxy| Grafana[Grafana Dashboard UI :3000 / Host:3200]
        
        Backend -->|Mongoose Driver :27017| MongoDB[(MongoDB 7.0 Persistent Store)]
        Backend -->|Session Store| MongoSession[(MongoStore Session Collection)]
        
        Prometheus[Prometheus Server :9090] -->|Scrapes /metrics| Backend
        Prometheus -->|Scrapes :9090| Prometheus
        
        Backend -->|Pushes Structured JSON Logs| Loki[Grafana Loki Log Storage :3100]
        Alloy[Grafana Alloy Collector] -->|Pushes Container Logs| Loki
        
        Grafana -->|PromQL Queries| Prometheus
        Grafana -->|LogQL Queries| Loki
    end
```

---

### 2. Component Responsibilities

#### 2.1 Ingress Proxy (Nginx)
- **Single Entry Point**: Exposes the application on default HTTP port 80 (`http://localhost`).
- **Routing**: Routes `/api/*` to the Node.js backend, `/grafana/*` to Grafana, and all other routes to the React frontend SPA.
- **Security**: Injects security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `X-XSS-Protection`).
- **Tracing**: Injects and propagates an immutable `X-Request-ID` across every client request.
- **Metrics Privacy**: Restricts `/metrics` endpoint from public client access.

#### 2.2 Backend Service (Express + TypeScript)
- **Session-Based Authentication**: Secure HTTP-only cookie sessions stored in MongoDB with Argon2id password hashing.
- **Atomic Operations**: Employs MongoDB atomic conditional operators (`$inc`, `$set`, `$gte`) to guarantee balance consistency and prevent double-deduction race conditions.
- **Telemetry Instrumentation**: Native `prom-client` metrics exporter capturing HTTP duration histograms, request rates, status codes, process memory, and business operations.

#### 2.3 Frontend Application (React 18 + Vite)
- **Role-Based Shell**: Dynamic sidebar and topbar conforming to Employee, Manager, and Admin permissions.
- **Server State Management**: TanStack Query handles caching, deduplication, background synchronization, and optimistic UI updates.
- **Strict Accessibility & Iconography**: 100% Bootstrap Icons; zero emoji characters across interface, toasts, and charts.

#### 2.4 Observability Stack (Grafana, Prometheus & Loki)
- **Prometheus**: Automated scraper with 5-second sampling interval collecting process and application metrics.
- **Grafana Loki**: High-performance log aggregation engine receiving real-time logs from backend and reverse proxy.
- **Grafana**: Pre-provisioned production dashboards visualizing system health, business KPIs, runtime health, and diagnostic logs.

---

### 3. Observability Architecture & Dashboards

![Grafana Dashboards Index](images/grafana/grafana-dashboard-index.png)

#### 3.1 Infrastructure & Ingress Proxy
Monitors service liveness, database connection state, and Nginx ingress throughput.

![Infrastructure & Nginx Proxy](images/grafana/grafana-infrastructure.png)

#### 3.2 Backend Runtime & V8 Engine
Monitors Node.js process uptime, heap memory allocation, resident memory (RSS), and CPU load.

![Backend Runtime](images/grafana/grafana-backend-runtime.png)

#### 3.3 Application Overview
Tracks total HTTP requests, p95 latency, error rates, and route-level traffic distribution.

![Application Overview](images/grafana/grafana-app-overview.png)

#### 3.4 Business Operations Telemetry
Monitors leave requests, approvals backlog, decision velocity, and authentication volume.

![Business Operations](images/grafana/grafana-business-ops.png)

#### 3.5 Logs & Diagnostics Stream
Real-time Loki log streaming for system troubleshooting and audit analysis.

![Logs & Diagnostics](images/grafana/grafana-logs-diagnostics.png)

---

*Leave Management System — Exelon Circuits Pvt. Ltd.*
