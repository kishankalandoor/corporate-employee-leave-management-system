# REST API Specification
## Leave Management System (LMS) — Exelon Circuits Pvt. Ltd.

All API routes are served under `/api` and return standardized JSON payloads:
```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

---

### Authentication (`/api/auth`)

#### `POST /api/auth/login`
- **Access**: Public (Rate-limited: 50 attempts/15min)
- **Request Body**:
  ```json
  { "email": "employee@exeloncircuits.com", "password": "Password@123" }
  ```
- **Response**: Sets HTTP-only `lms_session` cookie; returns sanitized User object.

#### `POST /api/auth/logout`
- **Access**: Authenticated
- **Response**: Destroys session in MongoStore, clears cookie, writes audit event.

#### `GET /api/auth/me`
- **Access**: Authenticated
- **Response**: Returns current session user with role and department info.

---

### Leave Requests (`/api/leaves`)

#### `GET /api/leaves`
- **Access**: Authenticated
- **Query Parameters**: `status` (optional: pending, approved, rejected, cancelled), `year`, `page`, `limit`
- **Description**: Returns leave requests scoped to the caller (employees see only their own, managers see team, admins see all).

#### `POST /api/leaves`
- **Access**: Authenticated (Employee)
- **Request Body**:
  ```json
  {
    "leaveTypeId": "660c1...",
    "startDate": "2026-04-10",
    "endDate": "2026-04-12",
    "isHalfDay": false,
    "halfDayType": "first-half",
    "reason": "Family vacation"
  }
  ```
- **Validation**: Checks overlap, verifies working days, checks available quota, atomically reserves `pendingDays`.

#### `PATCH /api/leaves/:id/cancel`
- **Access**: Authenticated (Owner if pending; Admin if approved)
- **Response**: Releases or restores balance and sets status to `cancelled`.

---

### Approvals (`/api/approvals`)

#### `GET /api/approvals/pending`
- **Access**: Manager or Admin
- **Description**: Returns pending leave requests within the manager's authorized team.

#### `PATCH /api/approvals/:id`
- **Access**: Manager or Admin
- **Request Body**:
  ```json
  {
    "decision": "approved",
    "comments": "Approved. Have a great vacation."
  }
  ```
- **Guarantees**: Atomic conditional update. Prevents double-processing and self-approval.

---

### Leave Balances (`/api/leave-balances`)

#### `GET /api/leave-balances/me`
- **Access**: Authenticated
- **Description**: Returns computed available balances for the caller:
  `Available = Entitlement + CarryForward + Adjustments - Used`.

#### `POST /api/leave-balances/:employeeId/adjustments`
- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "leaveTypeId": "660c1...",
    "adjustmentDays": 2,
    "policyYear": 2026,
    "reason": "Compensatory off for production maintenance Sunday"
  }
  ```

---

### Reporting & Health

#### `GET /api/reports/leaves`
- **Access**: Manager or Admin
- **Parameters**: `status`, `department`, `startDate`, `endDate`

#### `GET /api/reports/leaves/export`
- **Access**: Manager or Admin
- **Description**: Streams a sanitized CSV file with formula-injection mitigation (`=`, `+`, `-`, `@` characters sanitized).

#### `GET /api/health`
- **Access**: Public
- **Description**: Liveness check returning process status, uptime, and database connectivity.

#### `GET /metrics`
- **Access**: Internal Docker network only
- **Description**: Prometheus metrics in standard exposition format.
