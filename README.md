# Employee Payroll Management System

A college-level, production-grade full-stack **Employee Payroll Management System** powered by **MySQL 8+ / MariaDB**, **Node.js**, **Express.js**, and **React.js (Vite + Tailwind CSS)**. Designed around strict **Third Normal Form (3NF)** relational modeling, real **ACID transactions**, **SQL views**, **SQL triggers**, **stored procedures**, **correlated subqueries**, and **bcrypt + JWT authentication**.

---

## 1. Problem Statement

Manual or spreadsheet-based payroll administration suffers from data redundancy, inconsistent salary component calculations, missing audit trails, duplicate monthly payouts, and lack of referential integrity. Organizations need a centralized relational database system that enforces atomic compensation rules, connects daily attendance and overtime directly to monthly payroll runs, prevents duplicate payroll generation, and provides department-level financial reporting.

---

## 2. Objectives

- Model organizational entities (`DEPARTMENT`, `DESIGNATION`, `EMPLOYEE`, `ATTENDANCE`, `SALARY_STRUCTURE`, `ALLOWANCE`, `DEDUCTION`, `PAYROLL`) in **Third Normal Form (3NF)**.
- Eliminate multi-valued attributes (no comma-separated allowances or deductions) via normalized junction tables (`SALARY_ALLOWANCE`, `SALARY_DEDUCTION`).
- Enforce monetary and referential integrity at the database engine level using **Foreign Keys**, **UNIQUE constraints**, **CHECK constraints**, and **BEFORE INSERT / BEFORE UPDATE triggers**.
- Automate monthly payroll generation atomically using **MySQL Transactions** (`START TRANSACTION` / `COMMIT` / `ROLLBACK`) and a **Stored Procedure** (`sp_generate_monthly_payroll`).
- Expose secure, parameterized REST APIs with **bcrypt** password hashing, **JWT** authentication, **Helmet**, **CORS**, and rate limiting.
- Deliver a responsive executive dashboard with live SQL analytics, charts, search/filtering, payslip printing/download, and CSV reports.

---

## 3. Features

- **Authentication & Security**: First-run atomic administrator setup (when uninitialized), bcrypt password hashing, JWT Bearer authentication, rate-limited login, Helmet headers, and parameterized SQL queries.
- **Executive Dashboard**: 7 live SQL KPI cards and 4 Recharts visualizations (Employees by Department, Salary by Department, Monthly Payroll Trend, Attendance Summary).
- **Employee Directory**: Full CRUD, search across code/name/email, multi-filter (department, designation, status), view profile modal, and safe deactivation when payroll history exists.
- **Organization Masters**: Department and Designation CRUD protected by foreign key `RESTRICT` rules.
- **Attendance Management**: Daily, Monthly, and Employee History views with attendance status tracking (`PRESENT`, `HALF_DAY`, `LEAVE`, `ABSENT`, `HOLIDAY`), working hours, overtime hours, and monthly summary stats.
- **Salary Structure & Component Catalog**: Master CRUD for `ALLOWANCE` and `DEDUCTION` (`FIXED` or `PERCENTAGE`), plus dynamic multi-component assignment with live preview.
- **Monthly Payroll Generation**: Live SQL preview, duplicate period prevention, and choice between Express-managed MySQL Transaction (`beginTransaction`/`commit`/`rollback`) or Stored Procedure (`sp_generate_monthly_payroll`).
- **Payroll Ledger & Payslips**: View itemized payslips, print payslips, download payslip receipts, and mark generated payroll as `PAID` (locked by trigger `before_payroll_update`).
- **SQL Reports**: Department Salary Aggregation (`COUNT`, `SUM`, `AVG`, `GROUP BY`, `HAVING`), Employee Salary Report (`vw_employee_payroll`), Attendance Report, Monthly Payroll Report, and Above Department Average Report (correlated subquery), all with CSV export.

---

## 4. Technology Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Axios, Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js, `mysql2/promise`, `bcryptjs`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit` |
| **Database** | MySQL 8+ / MariaDB 10+ (InnoDB engine, Views, Triggers, Stored Procedures, Transactions) |

---

## 5. System Requirements

- Node.js `v20+` (or `v22+`)
- MySQL `8.0+` (or MariaDB `10.6+`)
- `npm` or `bun`

---

## 6. Installation & Environment Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your local credentials:
   ```env
   PORT=3000
   NODE_ENV=development
   APP_URL=http://localhost:3000

   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=payroll_app
   DB_PASSWORD=your_mysql_password
   DB_NAME=employee_payroll_db

   JWT_SECRET=your_long_random_jwt_secret
   ADMIN_EMAIL=
   ADMIN_PASSWORD=
   ```

---

## 7. Database Setup

You can import the SQL files manually in order (or let `server.ts` bootstrap them automatically on startup):

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/views.sql
mysql -u root -p < database/triggers.sql
mysql -u root -p < database/procedures.sql
mysql -u root -p < database/sample_data.sql
```

---

## 8. Running the Application

### Development (Full-Stack on Port 3000)
```bash
npm run dev
```

### Production Build & Start
```bash
npm run build
npm start
```

---

## 9. Default Login & First-Run Setup

- **First-Run Setup**: When the `ADMIN_USER` table is empty and `ADMIN_EMAIL` / `ADMIN_PASSWORD` are not set in `.env`, navigating to `/login` automatically presents an **Initial Administrator Setup** form. Submitting it hashes the chosen password with `bcrypt` (`10` salt rounds) inside a MySQL transaction and locks the setup route permanently.
- **Environment Override**: Alternatively, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (or Settings -> Secrets) to authenticate directly against server environment credentials.

---

## 10. Database Architecture & ER Diagram

```
+--------------+       1:M       +------------------+       M:1       +---------------+
|  DEPARTMENT  |-----------------|     EMPLOYEE     |-----------------|  DESIGNATION  |
+--------------+                 +------------------+                 +---------------+
                                   |       |       |
                              1:M  |  1:M  |  1:M  |
               +-------------------+       |       +-------------------+
               |                           |                           |
               v                           v                           v
       +--------------+          +------------------+          +---------------+
       |  ATTENDANCE  |          | SALARY_STRUCTURE |          |    PAYROLL    |
       +--------------+          +------------------+          +---------------+
                                     |           |
                                1:M  |           | 1:M
                                     v           v
                        +------------------+   +------------------+
                        | SALARY_ALLOWANCE |   | SALARY_DEDUCTION |
                        +------------------+   +------------------+
                                |                     |
                           M:1  |                     | M:1
                                v                     v
                        +------------+         +-----------+
                        | ALLOWANCE  |         | DEDUCTION |
                        +------------+         +-----------+
```

### Table Descriptions

| Table | Purpose | Primary Key |
| --- | --- | --- |
| `ADMIN_USER` | Stores bcrypt-hashed system administrator credentials | `admin_id` |
| `DEPARTMENT` | Stores company departments (`HR`, `IT`, `Finance`, `Marketing`, `Operations`) | `department_id` |
| `DESIGNATION` | Stores job titles and role descriptions | `designation_id` |
| `EMPLOYEE` | Master staff directory linked to `DEPARTMENT` and `DESIGNATION` | `employee_id` |
| `ATTENDANCE` | Daily shift records with unique `(employee_id, attendance_date)` constraint | `attendance_id` |
| `SALARY_STRUCTURE` | Versioned basic salary contracts (`ACTIVE` / `INACTIVE`) per employee | `salary_structure_id` |
| `ALLOWANCE` | Master catalog of allowance types (`FIXED` / `PERCENTAGE`) | `allowance_id` |
| `DEDUCTION` | Master catalog of deduction types (`FIXED` / `PERCENTAGE`) | `deduction_id` |
| `SALARY_ALLOWANCE` | Junction table assigning specific allowances to a salary structure | `salary_allowance_id` |
| `SALARY_DEDUCTION` | Junction table assigning specific deductions to a salary structure | `salary_deduction_id` |
| `PAYROLL` | Monthly generated payroll ledger with unique `(employee_id, payroll_month, payroll_year)` | `payroll_id` |

### Relationships

- `DEPARTMENT (1) ── (M) EMPLOYEE`
- `DESIGNATION (1) ── (M) EMPLOYEE`
- `EMPLOYEE (1) ── (M) ATTENDANCE`
- `EMPLOYEE (1) ── (M) SALARY_STRUCTURE`
- `SALARY_STRUCTURE (1) ── (M) SALARY_ALLOWANCE (M) ── (1) ALLOWANCE`
- `SALARY_STRUCTURE (1) ── (M) SALARY_DEDUCTION (M) ── (1) DEDUCTION`
- `EMPLOYEE (1) ── (M) PAYROLL`

---

## 11. Normalization (1NF, 2NF, 3NF)

### First Normal Form (1NF)
- Every column holds **atomic** values (e.g., `first_name` and `last_name` are separated; `address`, `phone`, `email` are atomic).
- **No repeating groups or comma-separated lists**: Allowances and deductions are never stored as `"HRA:500,TA:200"` inside `SALARY_STRUCTURE` or `EMPLOYEE`. Each assigned component is an individual row in `SALARY_ALLOWANCE` or `SALARY_DEDUCTION`.

### Second Normal Form (2NF)
- Every table has a single-column surrogate `AUTO_INCREMENT` primary key (`employee_id`, `salary_structure_id`, etc.) with natural `UNIQUE` constraints on composite business keys (`(employee_id, attendance_date)`, `(salary_structure_id, allowance_id)`, `(employee_id, payroll_month, payroll_year)`).
- Every non-key attribute is **fully functionally dependent** on the complete primary key—no partial dependencies exist.

### Third Normal Form (3NF)
- **No transitive dependencies**:
  - `EMPLOYEE` stores `department_id` and `designation_id` instead of `department_name` or `designation_description`. Changing a department name updates one row in `DEPARTMENT` with zero update anomalies.
  - Why `ALLOWANCE`, `DEDUCTION`, `SALARY_STRUCTURE`, `SALARY_ALLOWANCE`, and `SALARY_DEDUCTION` are separated:
    1. `SALARY_STRUCTURE` depends solely on the employee's compensation contract (`basic_salary`, `effective_from`, `status`).
    2. `ALLOWANCE` and `DEDUCTION` describe reusable master component definitions (`allowance_name`, `allowance_type`, `default_amount`) independent of any single employee.
    3. `SALARY_ALLOWANCE` and `SALARY_DEDUCTION` resolve the many-to-many (`M:N`) relationship between a salary structure and its components while capturing the contract-specific `amount` without duplicating component names or descriptions.

---

## 12. SQL Operations & Advanced DBMS Features

All 20 demonstration queries are stored in `database/queries.sql`:

- **CRUD Operations**: Parameterized `SELECT`, `INSERT`, `UPDATE`, `DELETE` across all entities.
- **JOIN Queries**: `INNER JOIN` (employees + departments + designations) and `LEFT JOIN` (employees + optional active salary structures / attendance logs).
- **Aggregate Queries**: `COUNT()`, `SUM()`, `AVG()`, `MIN()`, `MAX()` with `GROUP BY` and `HAVING` (e.g., Department Salary Report filtering departments by minimum headcount or payroll threshold).
- **Nested & Correlated Subquery**:
  ```sql
  SELECT v.employee_code, v.employee_name, v.department_name, v.net_salary AS employee_salary,
    (SELECT ROUND(AVG(v2.net_salary), 2)
     FROM vw_employee_compensation v2
     WHERE v2.department_id = v.department_id) AS department_avg_salary
  FROM vw_employee_compensation v
  WHERE v.net_salary > (
    SELECT AVG(v2.net_salary)
    FROM vw_employee_compensation v2
    WHERE v2.department_id = v.department_id
  );
  ```
- **SQL Views (`database/views.sql`)**:
  - `vw_employee_payroll`: Joins `PAYROLL`, `EMPLOYEE`, `DEPARTMENT`, and `DESIGNATION` for reports and the payroll ledger.
  - `vw_employee_compensation`: Aggregates active `SALARY_STRUCTURE` + `SALARY_ALLOWANCE` + `SALARY_DEDUCTION`.
- **SQL Triggers (`database/triggers.sql`)**:
  - `before_payroll_insert`: Validates month/year ranges, ensures `basic_salary`, `total_allowance`, `overtime_pay`, `total_deduction`, `gross_salary`, `net_salary >= 0`, and enforces `gross_salary = basic_salary + total_allowance + overtime_pay` and `net_salary = gross_salary - total_deduction` via `SIGNAL SQLSTATE '45000'`.
  - `before_payroll_update`: Prevents tampering with monetary fields once `payroll_status = 'PAID'`.
  - `before_salary_structure_insert`: Prevents negative `basic_salary` and invalid effective date ranges.
- **Stored Procedure (`database/procedures.sql`)**:
  - `sp_generate_monthly_payroll(IN p_month INT, IN p_year INT, OUT p_generated_count INT)`: Executes inside `START TRANSACTION` with `DECLARE EXIT HANDLER FOR SQLEXCEPTION` (`ROLLBACK; RESIGNAL;`), locks and blocks duplicate payroll periods using `FOR UPDATE`, and computes all monthly payroll rows in SQL `DECIMAL(12,2)`.
- **Transactions & ACID Properties**:
  - **Atomicity**: Either all active employees receive payroll for `(month, year)` or `ROLLBACK` undoes everything.
  - **Consistency**: Triggers + `CHECK` + `FK` constraints guarantee `net_salary = gross_salary - total_deduction` and valid department/employee links.
  - **Isolation**: `SELECT ... FOR UPDATE` inside transactions prevents concurrent duplicate payroll runs.
  - **Durability**: Committed InnoDB records persist safely across server restarts.

---

## 13. Payroll Calculation Formula

All calculations are performed in SQL `DECIMAL(12,2)`:

```
Total Allowance = SUM(SALARY_ALLOWANCE.amount for active structure)
Overtime Rate   = ROUND((basic_salary / 160.00) * 1.50, 2)
Overtime Pay    = ROUND(SUM(ATTENDANCE.overtime_hours) * Overtime Rate, 2)
Gross Salary    = ROUND(basic_salary + Total Allowance + Overtime Pay, 2)
Total Deduction = SUM(SALARY_DEDUCTION.amount for active structure)
Net Salary      = ROUND(Gross Salary - Total Deduction, 2)
```

---

## 14. API Documentation

All endpoints except `/api/health` and `/api/auth/*` require `Authorization: Bearer <token>`.

| Group | Method & Path | Description |
| --- | --- | --- |
| Auth | `GET /api/auth/status` | Check if initial admin exists |
| Auth | `POST /api/auth/setup` | Atomic first-run admin creation |
| Auth | `POST /api/auth/login` | Authenticate admin & issue JWT |
| Dashboard | `GET /api/dashboard/summary` | KPI totals & 4 chart datasets |
| Employees | `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/:id` | Employee CRUD, search & filters |
| Departments | `GET/POST /api/departments`, `PUT/DELETE /api/departments/:id` | Department CRUD |
| Designations | `GET/POST /api/designations`, `PUT/DELETE /api/designations/:id` | Designation CRUD |
| Attendance | `GET/POST /api/attendance`, `GET /api/attendance/stats`, `PUT/DELETE /api/attendance/:id` | Attendance logging & statistics |
| Salaries | `GET /api/salaries`, `GET /api/salaries/:employeeId`, `POST /api/salaries`, `PUT /api/salaries/:id` | Transactional salary structure CRUD |
| Allowances | `GET/POST /api/allowances`, `PUT/DELETE /api/allowances/:id` | Master allowance CRUD |
| Deductions | `GET/POST /api/deductions`, `PUT/DELETE /api/deductions/:id` | Master deduction CRUD |
| Payroll | `GET /api/payroll`, `GET /api/payroll/preview`, `GET /api/payroll/:id`, `GET /api/payroll/monthly/:year/:month`, `POST /api/payroll/generate`, `PATCH /api/payroll/:id/pay` | Preview, generate (Transaction / Stored Procedure), payslip view & disbursement |
| Reports | `GET /api/reports/department-salary`, `employee-salary`, `attendance`, `monthly-payroll`, `above-department-average` | Aggregations, views, and nested subquery reports |

---

## 15. Screenshots

- `/login`: Initial Administrator Setup & JWT Sign-In screen.
- `/dashboard`: Executive KPI cards and 4 Recharts visualizations.
- `/employees`: Searchable, multi-filterable directory with View/Edit/Deactivate modals.
- `/salary-structures`: Multi-allowance/deduction editor with real-time net salary preview.
- `/payroll/generate`: Transactional payroll preview & execution console.
- `/reports`: Correlated subquery outliers and CSV-exportable SQL reports.

---

## 16. Future Enhancements

- Employee self-service portal for leave requests and payslip downloads.
- Multi-currency payroll conversion and automated PDF payslip generation.
- Role-based access control (`HR_MANAGER`, `FINANCE_AUDITOR`) with audit log table.

---

## 17. Troubleshooting

- **MySQL Connection Refused (`ECONNREFUSED`)**: Ensure MySQL/MariaDB is running on `DB_HOST:DB_PORT` (`127.0.0.1:3306`) and credentials in `.env` match your MySQL user.
- **Duplicate Payroll Error (`409 Conflict`)**: Payroll can only be generated once per `(month, year)` due to `UNIQUE(employee_id, payroll_month, payroll_year)` and transaction locks.
- **Cannot Delete Department / Designation (`409 Conflict`)**: Foreign key `ON DELETE RESTRICT` prevents deleting units that still have employees assigned. Reassign employees first.
