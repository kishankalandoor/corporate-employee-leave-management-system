# Security Architecture & Risk Mitigations
## Leave Management System (LMS) — Exelon Circuits Pvt. Ltd.

---

### 1. Threat Model & Defense In Depth

#### 1.1 Authentication & Session Integrity
- **Password Storage**: Modern Argon2id hashing with randomized salts. Plaintext passwords never reach logs or persistent storage.
- **Session Management**: Server-backed sessions stored in MongoDB `sessions` collection via `connect-mongo`.
- **HTTP-Only Cookies**: `lms_session` cookie configured with `httpOnly: true`, `sameSite: 'lax'`, preventing XSS cookie theft.
- **Rate Limiting**: `express-rate-limit` throttles login attempts (50 attempts per 15 minutes per IP) to mitigate brute-force attacks.

#### 1.2 Authorization & Access Control (RBAC)
- **Multi-Layer Enforcement**: Backend route middlewares (`requireAuth`, `requireManagerOrAdmin`, `requireAdmin`) strictly guard endpoints. Hiding buttons in the frontend is purely ergonomic; backend re-validates permissions on every request.
- **Team Isolation**: Managers can only inspect and approve leave requests belonging to direct reportees within their department. Self-approval is explicitly prohibited in code and returns `403 Forbidden`.
- **Employee Privacy**: Employees cannot query other staff members' balances or historical applications by altering path parameters.

#### 1.3 Injection Protections
- **NoSQL Injection**: `express-mongo-sanitize` strips out `$` and `.` operators from client query parameters and request bodies.
- **Spreadsheet Formula Injection (CSV)**: Exported spreadsheet cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with a single apostrophe (`'`) to prevent Remote Code Execution (RCE) in Microsoft Excel / LibreOffice.
- **Cross-Site Scripting (XSS)**: Helmet HTTP security headers configure `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict referrer policy.

#### 1.4 Least Privilege Containerization
- **Non-Root Execution**: Backend container runs as a dedicated system user `nodejs:nodejs`.
- **Internal Network Isolation**: MongoDB and monitoring components (Loki, Alloy) communicate across Docker's internal bridge network (`lms_network`) without publishing exposed ports to host interfaces.
- **Proxy Ingress**: Nginx serves as the sole perimeter ingress on port 80.
