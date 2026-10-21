# Database Architecture & Data Modelling
## Leave Management System (LMS) — Exelon Circuits Pvt. Ltd.

---

### 1. Collections & Data Schema Overview

The database uses MongoDB 7.0 with Mongoose ODM strict schemas, validation rules, virtuals, and compound indexes.

```mermaid
erDiagram
    Department ||--o{ User : "contains"
    User ||--o{ User : "manages"
    User ||--o{ LeaveRequest : "submits"
    User ||--o{ LeaveBalance : "owns"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "acts in"
    LeaveType ||--o{ LeavePolicy : "configured in"
    LeaveType ||--o{ LeaveRequest : "categorizes"
    LeaveType ||--o{ LeaveBalance : "allocates"
    Holiday ||--o{ Department : "applies to"
```

---

### 2. Schema Details

#### `users` Collection
- `employeeId`: String, unique, indexed (e.g. `EXL-0001`)
- `firstName`, `lastName`: String
- `email`: String, unique, lowercased, indexed
- `passwordHash`: String (Argon2id)
- `role`: Enum `['employee', 'manager', 'admin']`, indexed
- `department`: ObjectId -> `departments`, indexed
- `manager`: ObjectId -> `users` (self-referential hierarchy)
- `status`: Enum `['active', 'inactive']`, indexed
- `employmentStatus`: Enum `['full-time', 'part-time', 'contract', 'on-notice']`
- `joiningDate`: Date

#### `departments` Collection
- `name`: String, unique (e.g. `Engineering`, `Human Resources`, `Sales`)
- `code`: String, unique, uppercase (e.g. `ENG`, `HR`, `FIN`, `EXEC`)
- `description`: String
- `isActive`: Boolean

#### `leave_types` Collection
- `name`: String, unique (e.g. `Casual Leave`, `Sick Leave`, `Annual Leave`)
- `code`: String, unique (e.g. `CL`, `SL`, `AL`, `UL`, `ML`, `PL`)
- `isPaid`: Boolean
- `requiresApproval`: Boolean
- `allowHalfDay`: Boolean
- `color`: Hex color string
- `isActive`: Boolean

#### `leave_policies` Collection
- `leaveType`: ObjectId -> `leave_types`
- `department`: ObjectId -> `departments` (nullable for company-wide default)
- `policyYear`: Number (e.g. `2026`)
- `annualEntitlement`: Number
- `carryForwardAllowed`: Boolean
- `maxCarryForwardDays`: Number
- `minAdvanceNoticeDays`: Number
- `maxConsecutiveDays`: Number

#### `leave_balances` Collection
- Compound unique index: `{ employee: 1, leaveType: 1, policyYear: 1 }`
- `employee`: ObjectId -> `users`
- `leaveType`: ObjectId -> `leave_types`
- `policyYear`: Number
- `entitlement`: Number
- `carryForward`: Number
- `adjustments`: Number
- `usedDays`: Number
- `pendingDays`: Number

**Balance Calculation Formula**:
$$\text{Available} = \max(0, \text{entitlement} + \text{carryForward} + \text{adjustments} - \text{usedDays})$$

![Leave Balances](images/ui/ui-leave-balances.png)

#### `leave_requests` Collection
- `requestNumber`: String, unique, indexed (e.g. `LR-2026-EXL-0001`)
- `employee`: ObjectId -> `users`, indexed
- `leaveType`: ObjectId -> `leave_types`, indexed
- `startDate`: Date, indexed
- `endDate`: Date, indexed
- `isHalfDay`: Boolean
- `halfDayType`: Enum `['first-half', 'second-half']`
- `workingDays`: Number
- `reason`: String
- `status`: Enum `['pending', 'approved', 'rejected', 'cancelled']`, indexed
- `approver`: ObjectId -> `users`
- `approvedAt`: Date
- `approverComments`: String
- `submittedAt`: Date, indexed

#### `holidays` Collection
- `name`: String (e.g. `Republic Day`, `Makara Sankranti`)
- `date`: Date, indexed
- `year`: Number, indexed (e.g. `2026`)
- `type`: Enum `['official', 'optional', 'half-day-afternoon', 'half-day-morning', 'special-working-day']`
- `scope`: Enum `['company-wide', 'department']`
- `applicableDepartments`: Array of ObjectId -> `departments`
- `description`: String
- `declaredBy`: ObjectId -> `users`

![Holiday Calendar](images/ui/ui-holiday-calendar.png)

#### `audit_logs` Collection
- `actor`: ObjectId -> `users`
- `actorEmail`: String
- `action`: String, indexed (e.g. `auth.login`, `leave.approved`, `leave.override_status`)
- `entityType`: String, indexed
- `entityId`: String
- `description`: String
- `metadata`: Object
- `ipAddress`: String
- `userAgent`: String
- `timestamp`: Date, indexed (default `Date.now`)

---

*Leave Management System — Exelon Circuits Pvt. Ltd.*
