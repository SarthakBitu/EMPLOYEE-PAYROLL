# DBMS Viva Questions & Answers — Employee Payroll Management System

Prepared specifically for college DBMS practical examinations and viva defense of this project.

---

### 1. What is DBMS?
A **Database Management System (DBMS)** is software that enables users and applications to define, store, retrieve, update, and manage structured data efficiently while enforcing integrity, security, and concurrency control. In this project, **MySQL / MariaDB** acts as the DBMS.

### 2. What is RDBMS?
A **Relational Database Management System (RDBMS)** stores data in two-dimensional tables (relations) consisting of rows (tuples) and columns (attributes), where relationships between tables are established using **Primary Keys** and **Foreign Keys** based on E.F. Codd's relational model.

### 3. What is a Primary Key?
A **Primary Key (PK)** is a column or minimal set of columns that uniquely identifies each row in a table and cannot contain `NULL` values. Examples in our schema: `employee_id` in `EMPLOYEE`, `department_id` in `DEPARTMENT`, `payroll_id` in `PAYROLL`.

### 4. What is a Foreign Key?
A **Foreign Key (FK)** is an attribute in one table that references the Primary Key (or Unique Key) of another table, enforcing **referential integrity**. For example, `EMPLOYEE.department_id` references `DEPARTMENT.department_id`.

### 5. Why did you use Foreign Keys in this payroll system?
Foreign keys prevent orphan records and invalid references—for example, you cannot assign an employee to a non-existent `department_id`, log attendance for a non-existent `employee_id`, or delete a `DEPARTMENT` (`ON DELETE RESTRICT`) while employees are still assigned to it.

### 6. What is Normalization?
**Normalization** is the systematic process of decomposing tables to eliminate data redundancy and prevent **insertion, update, and deletion anomalies** while preserving lossless joins and functional dependencies.

### 7. Explain First Normal Form (1NF).
A table is in **1NF** if all attributes contain only **atomic (indivisible) values** and there are no repeating groups or multi-valued attributes. In our system, we never store allowances or deductions as comma-separated strings (like `"HRA:500,Bonus:200"`). Instead, each assigned component is stored as an atomic row in `SALARY_ALLOWANCE` or `SALARY_DEDUCTION`.

### 8. Explain Second Normal Form (2NF).
A table is in **2NF** if it is in 1NF and every non-key attribute is **fully functionally dependent** on the entire primary key (no partial dependency on part of a composite key). Every table in our schema uses a single-column primary key and composite business rules are enforced via `UNIQUE` constraints, ensuring zero partial dependencies.

### 9. Explain Third Normal Form (3NF).
A table is in **3NF** if it is in 2NF and contains **no transitive dependencies** (no non-key attribute depends on another non-key attribute). For instance, `EMPLOYEE` stores `department_id` rather than `department_name` or `department_description`, because `department_description` depends on `department_id`, not `employee_id`.

### 10. Why are `ALLOWANCE` and `SALARY_ALLOWANCE` separated?
Because `SALARY_STRUCTURE` and `ALLOWANCE` have a **many-to-many (M:N)** relationship: one salary structure can have multiple allowances, and one allowance type (e.g., House Rent Allowance) can be assigned to many employees. Separating `ALLOWANCE` (master catalog) from `SALARY_ALLOWANCE` (junction table with `amount`) eliminates repeating allowance names, prevents update anomalies, and satisfies 1NF and 3NF.

### 11. Why are `DEDUCTION` and `SALARY_DEDUCTION` separated?
For the same normalization reason: `DEDUCTION` stores the master definition (`deduction_name`, `deduction_type`, `default_amount`) once, while `SALARY_DEDUCTION` links a specific `salary_structure_id` to a `deduction_id` with its resolved `amount`. Adding a new tax or modifying a deduction description happens in one row instead of hundreds of employee rows.

### 12. What is a JOIN?
A **JOIN** combines rows from two or more tables based on a related column.
- `INNER JOIN`: Returns only matching rows in both tables (used in `vw_employee_payroll` to combine `PAYROLL`, `EMPLOYEE`, `DEPARTMENT`, and `DESIGNATION`).
- `LEFT JOIN`: Returns all rows from the left table and matched rows from the right table, or `NULL` if none match (used when listing all active employees alongside optional monthly attendance or salary structures).

### 13. Why do we use `GROUP BY`?
`GROUP BY` partitions rows into summary groups based on one or more columns so aggregate functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) compute one summary value per group—for example, total net payroll per department in `GET /api/reports/department-salary`.

### 14. What is `HAVING` and how does it differ from `WHERE`?
`WHERE` filters individual rows **before** grouping and cannot use aggregate functions. `HAVING` filters grouped results **after** `GROUP BY` and aggregate calculations—for example, `HAVING COUNT(p.payroll_id) >= 4` or `HAVING SUM(p.net_salary) > 15000`.

### 15. What is a Subquery (Nested Query)?
A **subquery** is a query nested inside another SQL statement (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). For example, finding employees earning above the overall company average:
`WHERE ss.basic_salary > (SELECT AVG(basic_salary) FROM SALARY_STRUCTURE WHERE status = 'ACTIVE')`.

### 16. What is a Correlated Subquery?
A **correlated subquery** references columns from the outer query and is evaluated once for each candidate row processed by the outer query. In our Above Department Average report:
`WHERE v.net_salary > (SELECT AVG(v2.net_salary) FROM vw_employee_compensation v2 WHERE v2.department_id = v.department_id)`.

### 17. What is a SQL `VIEW`?
A **VIEW** is a named virtual table defined by a stored `SELECT` query. It does not store duplicate data physically (unless materialized) and dynamically reflects underlying table changes. We created `vw_employee_payroll` and `vw_employee_compensation`.

### 18. Why did you use `vw_employee_payroll`?
`vw_employee_payroll` encapsulates the 4-table join (`PAYROLL`, `EMPLOYEE`, `DEPARTMENT`, `DESIGNATION`) in one reusable database object, simplifying reporting queries, guaranteeing consistent column naming across `/api/payroll` and `/api/reports/employee-salary`, and hiding raw schema complexity.

### 19. What is a Trigger?
A **Trigger** is a procedural database object that executes automatically in response to a specific DML event (`INSERT`, `UPDATE`, `DELETE`) on a table, either `BEFORE` or `AFTER` the operation.

### 20. Why did you create `before_payroll_insert` and `before_payroll_update` triggers?
To enforce business invariants directly inside MySQL regardless of which client or script writes to `PAYROLL`. `before_payroll_insert` uses `SIGNAL SQLSTATE '45000'` to reject negative salary components or mismatched `gross_salary` / `net_salary` arithmetic. `before_payroll_update` locks financial amounts once `payroll_status = 'PAID'`.

### 21. What is a Stored Procedure?
A **Stored Procedure** is a precompiled block of SQL statements and control-flow logic stored in the database catalog and invoked with `CALL`. Our procedure is `sp_generate_monthly_payroll(p_month, p_year, @p_generated_count)`.

### 22. Why use a Stored Procedure for payroll?
It keeps heavy set-based payroll computation close to the data, reduces network round trips between Node.js and MySQL, allows centralized transaction & exception handling (`DECLARE EXIT HANDLER FOR SQLEXCEPTION`), and lets DBAs or scheduled jobs run payroll directly from SQL.

### 23. What is a Transaction?
A **Transaction** is a logical unit of work consisting of one or more SQL operations that must execute as an indivisible whole—either all succeed (`COMMIT`) or all fail and revert (`ROLLBACK`).

### 24. Why are Transactions mandatory for payroll generation?
Generating payroll inserts records for all active employees in a single cycle. Without a transaction, a failure halfway through (e.g., a trigger error on employee #12) would leave partial payroll records in `PAYROLL`, corrupting financial totals and blocking re-runs.

### 25. What are ACID properties?
- **Atomicity**: All-or-nothing execution (`COMMIT` or `ROLLBACK`).
- **Consistency**: Database moves from one valid state to another, respecting `FK`, `UNIQUE`, `CHECK`, and trigger rules.
- **Isolation**: Concurrent transactions do not interfere (`SELECT ... FOR UPDATE` prevents two admins from generating the same month simultaneously).
- **Durability**: Once committed, payroll records survive crashes and restarts in InnoDB logs/tablespaces.

### 26. What is `COMMIT`?
`COMMIT` permanently saves all changes made during the current transaction to the database and releases held row locks.

### 27. What is `ROLLBACK`?
`ROLLBACK` undoes all uncommitted changes made since `START TRANSACTION` (or `connection.beginTransaction()`), restoring the database to its prior consistent state whenever an error or validation failure occurs.

### 28. What is an Index?
An **Index** is a data structure (typically a **B-Tree** in InnoDB) built on one or more table columns to allow the query optimizer to locate matching rows quickly without scanning the entire table.

### 29. Why did you create indexes such as `idx_payroll_month_year` and `idx_attendance_date`?
Monthly payroll queries filter by `(payroll_year, payroll_month)` and attendance reports filter by `attendance_date` and `employee_id`. Composite and foreign-key indexes (`idx_employee_department`, `idx_employee_status`, `idx_salary_employee`, etc.) dramatically speed up `JOIN`, `WHERE`, and `GROUP BY` operations.

### 30. How are Gross Salary and Net Salary calculated in this system?
All monetary math runs in SQL `DECIMAL(12,2)`:
- `Total Allowance` = `SUM(SALARY_ALLOWANCE.amount)`
- `Overtime Pay` = `ROUND(overtime_hours * ROUND((basic_salary / 160.00) * 1.50, 2), 2)`
- `Gross Salary` = `basic_salary + Total Allowance + Overtime Pay`
- `Total Deduction` = `SUM(SALARY_DEDUCTION.amount)`
- `Net Salary` = `Gross Salary - Total Deduction`

### 31. How does the system prevent duplicate payroll?
Through **three defense layers**:
1. Database `UNIQUE KEY uq_payroll_employee_period (employee_id, payroll_month, payroll_year)`.
2. Transactional `SELECT COUNT(*) ... FOR UPDATE` lock check inside both `payrollService.ts` and `sp_generate_monthly_payroll`.
3. Backend HTTP `409 Conflict` response and frontend preview warning banner.

### 32. Why use `DECIMAL(12,2)` instead of `FLOAT` or JavaScript floating-point math for money?
Binary floating-point types (`FLOAT`, `DOUBLE`, JS `number` arithmetic like `0.1 + 0.2`) introduce rounding representation errors. `DECIMAL(12,2)` stores exact base-10 fixed-point financial values, ensuring `net_salary = gross_salary - total_deduction` passes strict trigger checks to the exact cent.
