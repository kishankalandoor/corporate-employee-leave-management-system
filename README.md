# Leave Management System (LMS)
### Enterprise HR SaaS Platform — Exelon Circuits Pvt. Ltd.

[![Docker Compose](https://img.shields.io/badge/Docker%20Compose-v2.29+-blue.svg)](https://docs.docker.com/compose/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47a248.svg)](https://www.mongodb.com/)
[![Grafana](https://img.shields.io/badge/Grafana-11.1-F46800.svg)](https://grafana.com/)
[![Prometheus](https://img.shields.io/badge/Prometheus-2.53-e6522c.svg)](https://prometheus.io/)

---

## 1. Project Overview

A full-stack, enterprise-grade Leave Management System (LMS) engineered for **Exelon Circuits Pvt. Ltd.** Designed with a modern, high-density SaaS aesthetic (Bootstrap 5, 100% Bootstrap Icons, strict zero-emoji design policy), robust business logic (atomic balance reservations, working-day calculations, double-deduction prevention), role-based access control, production Docker Compose orchestration, and an integrated Grafana/Prometheus/Loki observability stack.

---

## 2. Key Features

- **Multi-Role Authentication**: Dedicated portals for **Employees**, **Managers**, and **Administrators** backed by Argon2id password hashing and secure HTTP-only cookie sessions.
- **Leave Application Engine**:
  - Full-day and half-day (first half / second half) leaves.
  - Centralized working-day calculator skipping weekends and official public holidays.
  - Overlap collision detection and active balance validation.
- **Approval Backlog**:
  - Departmental managers review and approve/reject direct reports' requests.
  - Strict self-approval prevention and atomic status transition.
- **Real-Time Leave Balance Ledger**:
  - Dynamic formula: `Available = Entitlement + CarryForward + Adjustments - Used`.
  - Pending requests held in reservation without double-counting approved usage.
- **Company Management**:
  - Employee directory with status activation/deactivation.
  - Department and cost center management.
  - Annual leave policy and entitlement quota configuration.
- **Reporting & Analytics**:
  - Multi-dimensional filters (date range, department, status, leave category).
  - Secure CSV export with spreadsheet formula injection protection.
- **Enterprise Observability**:
  - Prometheus metrics instrumentation (`/metrics`).
  - Grafana pre-provisioned dashboards with real-time operational telemetry.
  - Centralized structured JSON logging via Grafana Alloy and Loki.

---

## 3. Demo Credentials

For local evaluation, the database is seeded automatically on startup with realistic demo accounts:

| Role | Email Address | Password | Department / Description |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@exeloncircuits.com` | `Admin@12345` | Human Resources (Full Admin Access) |
| **Manager** | `manager.eng@exeloncircuits.com` | `Manager@12345` | Engineering Head (Approves Eng Team) |
| **Manager** | `manager.hr@exeloncircuits.com` | `Manager@12345` | HR Manager (Approves HR Team) |
| **Employee** | `employee1@exeloncircuits.com` | `Employee@12345` | Rahul Kapoor (Senior Software Engineer) |
| **Employee** | `employee2@exeloncircuits.com` | `Employee@12345` | Aisha Khan (Frontend Developer) |
| **Employee** | `employee3@exeloncircuits.com` | `Employee@12345` | Vikram Singh (QA Automation Engineer) |

> **Tip**: The login page includes one-click "Quick Fill" demo buttons for Administrator, Manager, and Employee.

---

## 4. Quick Start with Docker Compose

### Step 1: Start All Services
```bash
docker compose up -d
```

### Step 2: Access Applications
- **Web Application Portal**: [http://localhost](http://localhost) (Served on default port 80 via Nginx)
- **Grafana Dashboards**: [http://localhost:3000](http://localhost:3000) (Login: `admin` / `admin`, or anonymous viewer)
- **Prometheus UI**: [http://localhost:9090](http://localhost:9090)

---

## 5. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript (strict mode)
- **Build Tool**: Vite 6
- **Styling**: Bootstrap 5.3 + Bootstrap Icons (Strict zero-emoji compliance)
- **State Management**: TanStack React Query v5
- **Forms & Validation**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js 20 LTS + Express
- **Language**: TypeScript with ESM (`NodeNext`)
- **Database**: MongoDB 7.0 + Mongoose ODM
- **Authentication**: Session cookies via `express-session` & `connect-mongo`
- **Security**: Argon2id, Helmet, `express-mongo-sanitize`, `express-rate-limit`
- **Logging**: Structured JSON with Pino

### Infrastructure & Observability
- **Reverse Proxy**: Nginx 1.27 Alpine on port 80
- **Metrics**: Prometheus 2.53 (`prom-client`)
- **Dashboards**: Grafana 11.1 (5 provisioned dashboards)
- **Logs**: Grafana Loki 3.1 & Grafana Alloy 1.2

---

## 6. Testing & Quality Assurance

Run backend unit and integration test suites:
```bash
npm --prefix backend test
```
All 20 test cases pass covering working-day logic, half-day computations, balance reservations, and cancellation balance restorations.

---

## 7. Documentation Index

- [Business Requirements Document (BRD)](./docs/BRD.md)
- [System Architecture & Network Design](./docs/ARCHITECTURE.md)
- [REST API Specification](./docs/API.md)
- [Database Schema & Balance Models](./docs/DATABASE.md)
- [Security & OWASP Mitigations](./docs/SECURITY.md)
- [Testing & Quality Report](./docs/TESTING.md)
- [Deployment & Operations Guide](./docs/DEPLOYMENT.md)
