# Business Requirements Document (BRD)
## Leave Management System (LMS) — Exelon Circuits Pvt. Ltd.

---

### 1. Executive Summary

This Business Requirements Document defines the enterprise Leave Management System (LMS) developed for **Exelon Circuits Pvt. Ltd.** The system digitizes, automates, and governs the entire lifecycle of employee time-off requests, departmental manager approvals, leave balance accounting, compliance reporting, and executive observability.

### 2. Business Problem & Objectives

#### Problems Addressed:
- Manual paper or email-based leave tracking is error-prone, lacks audit trails, and leads to unauthorized absences.
- Risk of concurrent leave approvals creating negative leave balances or understaffing critical manufacturing and engineering shifts.
- Lack of centralized operational visibility for HR and department heads.

#### Key Objectives:
- Provide an intuitive role-based portal for **Employees**, **Managers**, and **Administrators**.
- Enforce strict working-day calculation logic excluding weekends and declared company public holidays.
- Ensure atomic leave balance reservations and double-deduction prevention.
- Deliver comprehensive real-time observability (metrics, logs, traces) using Prometheus, Grafana, and Loki.

---

### 3. User Roles & Permission Matrix

| Feature / Action | Employee | Manager | Administrator |
| :--- | :---: | :---: | :---: |
| Self-Authentication & Profile View | Yes | Yes | Yes |
| Apply for Leave (Full Day & Half Day) | Yes | Yes | Yes |
| View Personal Leave History & Balances | Yes | Yes | Yes |
| Cancel Pending Requests | Yes | Yes | Yes |
| Cancel Approved Requests | No | No | Yes (Admin only) |
| View Team Pending Approvals | No | Yes (Assigned Team) | Yes (Company-wide) |
| Approve / Reject Leave Requests | No | Yes (Assigned Team) | Yes |
| Self-Approval of Own Requests | **Blocked** | **Blocked** | **Blocked** |
| Employee Directory Management | No | No | Yes (Create/Edit/Deactivate) |
| Department & Cost Center Setup | No | No | Yes |
| Leave Policy & Quota Configuration | No | No | Yes |
| Manual Balance Adjustments | No | No | Yes (With Audit Reason) |
| Compliance Reports & CSV Export | No | Team Only | Company-wide |
| Immutable System Audit Trail | No | No | Yes |

---

### 4. Detailed Leave Lifecycle & Business Rules

#### 4.1 Request Submission
1. **Selection**: Employee selects leave category (e.g., Casual Leave, Sick Leave, Earned Leave, Maternity/Paternity, Unpaid Leave).
2. **Date Picking**: Start Date and End Date.
3. **Half-Day Option**: Allowed on configured leave types. If half-day is checked, Start Date must equal End Date, and duration is counted as 0.5 working days.
4. **Working-Day Computation**: Centralized service computes elapsed days excluding Saturdays, Sundays, and official company holidays.
5. **Balance Check**: Available balance (`Entitlement + CarryForward + Adjustments - Used`) must be `>= requested days`.
6. **Reservation**: Upon submission, requested days are atomically incremented in `pendingDays`. The request state becomes `pending`.

#### 4.2 Approval Workflow
1. **Manager Notification**: The assigned reporting manager receives an in-app alert.
2. **Review**: Manager inspects duration, overlapping team absences, and employee reason.
3. **Decision**:
   - **Approval**: `status -> approved`. Atomically decrements `pendingDays` and increments `usedDays`.
   - **Rejection**: `status -> rejected`. Requires mandatory rejection comments. Atomically decrements `pendingDays` (restoring available balance).
4. **Idempotency**: Processing an already finalized request returns HTTP `409 Conflict`.

#### 4.3 Cancellation
- **Pending Requests**: May be cancelled by the employee at any time. Releases `pendingDays`.
- **Approved Requests**: Can only be cancelled by an Administrator. Restores consumed `usedDays` back to available quota.

---

### 5. Deployment & Technical Architecture

- **Ingress**: Reverse proxy via Nginx on standard HTTP port (`http://localhost:80`), with structured JSON access logs, security headers, compression, and request ID tracking.
- **Backend**: Node.js LTS with Express, strict TypeScript, Mongoose ODM, Argon2id hashing, express-session with MongoStore.
- **Database**: MongoDB 7.0 persistent named volume with compound indexes.
- **Frontend**: React 18, TypeScript, Vite, Bootstrap 5, Bootstrap Icons, TanStack Query.
- **Observability**: Prometheus metrics scraping `/metrics`, Loki centralized logs, Grafana Alloy collector, and Grafana UI on port 3000.
