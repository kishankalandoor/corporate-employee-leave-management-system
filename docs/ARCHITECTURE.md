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
        
        Backend -->|Mongoose Driver :27017| MongoDB[(MongoDB 7.0 Persistent Store)]
        Backend -->|Session Store| MongoSession[(MongoStore Session Collection)]
        
        Prometheus[Prometheus Server :9090] -->|Scrapes /metrics| Backend
        Prometheus -->|Scrapes :9090| Prometheus
        
        Alloy[Grafana Alloy Collector] -->|Pushes Container Logs| Loki[Grafana Loki Log Storage :3100]
        
        Grafana[Grafana Dashboard UI :3000] -->|PromQL Queries| Prometheus
        Grafana -->|LogQL Queries| Loki
    end
```

---

### 2. Component Responsibilities

#### 2.1 Ingress Proxy (Nginx)
- **Single Entry Point**: Exposes the entire system on port 80 (`http://localhost`).
- **Routing**: Routes `/api/*` to the Node.js backend and all other routes to the React frontend.
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

#### 2.4 Observability Stack
- **Prometheus**: Automated scraper with 5-second sampling interval and automated alerting rules.
- **Grafana Loki & Alloy**: Centralized log collection for container logs, Nginx access logs in JSON, and application error logs.
- **Grafana**: Auto-provisioned datasources and 5 pre-built production dashboards (Application Overview, Backend Runtime, Infrastructure, Business Operations, Logs).
