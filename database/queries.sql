-- ============================================================================
-- Employee Payroll Management System - Required SQL Demonstration Queries
-- Covers all 20 mandatory SQL & DBMS operations for evaluation and viva.
-- ============================================================================

USE employee_payroll_db;

-- 1. SELECT: Retrieve all active employees ordered by hire date
SELECT employee_id, employee_code, first_name, last_name, email, hire_date, employment_status
FROM EMPLOYEE
WHERE employment_status = 'ACTIVE'
ORDER BY hire_date ASC;

-- 2. INSERT: Insert a new allowance type
INSERT INTO ALLOWANCE (allowance_name, allowance_type, default_amount, description)
VALUES ('Shift Allowance', 'FIXED', 125.00, 'Night or rotational shift stipend');

-- 3. UPDATE: Update an employee's phone number and status
UPDATE EMPLOYEE
SET phone = '555-0199'
WHERE employee_code = 'EMP002';

-- 4. DELETE: Remove the temporary demonstration allowance
DELETE FROM ALLOWANCE
WHERE allowance_name = 'Shift Allowance';

-- 5. INNER JOIN: Employees with their department and designation names
SELECT
  e.employee_code,
  CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS full_name,
  d.department_name,
  des.designation_name,
  e.employment_status
FROM EMPLOYEE e
INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
ORDER BY d.department_name, e.employee_code;

-- 6. LEFT JOIN: All employees including those who may not yet have an active salary structure
SELECT
  e.employee_code,
  CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS full_name,
  e.employment_status,
  ss.basic_salary,
  ss.effective_from
FROM EMPLOYEE e
LEFT JOIN SALARY_STRUCTURE ss
  ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
ORDER BY e.employee_id;

-- 7. GROUP BY: Employee headcount and average basic salary per department
SELECT
  d.department_name,
  COUNT(e.employee_id) AS total_employees,
  ROUND(AVG(ss.basic_salary), 2) AS avg_basic_salary
FROM DEPARTMENT d
INNER JOIN EMPLOYEE e ON d.department_id = e.department_id
INNER JOIN SALARY_STRUCTURE ss ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
GROUP BY d.department_id, d.department_name;

-- 8. HAVING: Departments whose total monthly net payroll exceeds $15,000
SELECT
  d.department_name,
  COUNT(p.payroll_id) AS employee_count,
  SUM(p.net_salary) AS total_net_payroll
FROM PAYROLL p
INNER JOIN EMPLOYEE e ON p.employee_id = e.employee_id
INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
WHERE p.payroll_month = 10 AND p.payroll_year = 2026
GROUP BY d.department_id, d.department_name
HAVING SUM(p.net_salary) > 15000.00;

-- 9. ORDER BY: Top earners in October 2026 sorted by net salary descending
SELECT employee_code, employee_name, department_name, gross_salary, net_salary
FROM vw_employee_payroll
WHERE payroll_month = 10 AND payroll_year = 2026
ORDER BY net_salary DESC;

-- 10. COUNT: Count of attendance statuses per employee in October 2026
SELECT
  e.employee_code,
  CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS employee_name,
  COUNT(a.attendance_id) AS logged_days,
  SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_days,
  SUM(CASE WHEN a.status = 'LEAVE' THEN 1 ELSE 0 END) AS leave_days,
  SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days
FROM EMPLOYEE e
LEFT JOIN ATTENDANCE a
  ON e.employee_id = a.employee_id
  AND MONTH(a.attendance_date) = 10
  AND YEAR(a.attendance_date) = 2026
WHERE e.employment_status = 'ACTIVE'
GROUP BY e.employee_id, e.employee_code, e.first_name, e.last_name;

-- 11. SUM: Total company payroll expenditure by month and year
SELECT
  payroll_year,
  payroll_month,
  SUM(basic_salary) AS total_basic,
  SUM(total_allowance) AS total_allowances,
  SUM(overtime_pay) AS total_overtime,
  SUM(gross_salary) AS total_gross,
  SUM(total_deduction) AS total_deductions,
  SUM(net_salary) AS total_net
FROM PAYROLL
GROUP BY payroll_year, payroll_month
ORDER BY payroll_year DESC, payroll_month DESC;

-- 12. AVG: Average gross and net salary across all active employees
SELECT
  ROUND(AVG(basic_salary), 2) AS avg_basic_salary,
  ROUND(AVG(gross_salary), 2) AS avg_gross_salary,
  ROUND(AVG(net_salary), 2) AS avg_net_salary
FROM vw_employee_compensation;

-- 13. MIN: Minimum basic salary and net salary in each department
SELECT
  department_name,
  MIN(basic_salary) AS min_basic_salary,
  MIN(net_salary) AS min_net_salary
FROM vw_employee_compensation
GROUP BY department_name;

-- 14. MAX: Maximum basic salary and net salary in each department
SELECT
  department_name,
  MAX(basic_salary) AS max_basic_salary,
  MAX(net_salary) AS max_net_salary
FROM vw_employee_compensation
GROUP BY department_name;

-- 15. Nested Query: Employees earning more than the overall company average basic salary
SELECT
  e.employee_code,
  CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS employee_name,
  ss.basic_salary
FROM EMPLOYEE e
INNER JOIN SALARY_STRUCTURE ss ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
WHERE ss.basic_salary > (
  SELECT AVG(basic_salary)
  FROM SALARY_STRUCTURE
  WHERE status = 'ACTIVE'
)
ORDER BY ss.basic_salary DESC;

-- 16. Correlated Subquery: Employees earning above their own department's average basic salary
SELECT
  e.employee_code,
  CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS employee_name,
  d.department_name,
  des.designation_name,
  ss.basic_salary AS employee_salary,
  (
    SELECT ROUND(AVG(ss2.basic_salary), 2)
    FROM EMPLOYEE e2
    INNER JOIN SALARY_STRUCTURE ss2 ON e2.employee_id = ss2.employee_id AND ss2.status = 'ACTIVE'
    WHERE e2.department_id = e.department_id
      AND e2.employment_status = 'ACTIVE'
  ) AS department_avg_salary
FROM EMPLOYEE e
INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
INNER JOIN SALARY_STRUCTURE ss ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
WHERE e.employment_status = 'ACTIVE'
  AND ss.basic_salary > (
    SELECT AVG(ss2.basic_salary)
    FROM EMPLOYEE e2
    INNER JOIN SALARY_STRUCTURE ss2 ON e2.employee_id = ss2.employee_id AND ss2.status = 'ACTIVE'
    WHERE e2.department_id = e.department_id
      AND e2.employment_status = 'ACTIVE'
  )
ORDER BY d.department_name, ss.basic_salary DESC;

-- 17. View Query: Querying vw_employee_payroll for October 2026
SELECT *
FROM vw_employee_payroll
WHERE payroll_month = 10 AND payroll_year = 2026
ORDER BY employee_code;

-- 18. Payroll Report Query: Detailed monthly payslip summary using vw_employee_payroll
SELECT
  employee_code,
  employee_name,
  department_name,
  designation_name,
  basic_salary,
  total_allowance,
  overtime_pay,
  gross_salary,
  total_deduction,
  net_salary,
  present_days,
  leave_days,
  absent_days,
  payroll_status
FROM vw_employee_payroll
WHERE payroll_month = 10 AND payroll_year = 2026
ORDER BY department_name, net_salary DESC;

-- 19. Department Salary Aggregation Query
SELECT
  d.department_name AS Department,
  COUNT(p.payroll_id) AS Employees,
  ROUND(SUM(p.basic_salary), 2) AS Total_Basic,
  ROUND(SUM(p.gross_salary), 2) AS Total_Gross,
  ROUND(SUM(p.total_deduction), 2) AS Total_Deduction,
  ROUND(SUM(p.net_salary), 2) AS Total_Net,
  ROUND(AVG(p.net_salary), 2) AS Average_Salary
FROM DEPARTMENT d
INNER JOIN EMPLOYEE e ON d.department_id = e.department_id
INNER JOIN PAYROLL p ON e.employee_id = p.employee_id
WHERE p.payroll_month = 10 AND p.payroll_year = 2026
GROUP BY d.department_id, d.department_name
ORDER BY Total_Net DESC;

-- 20. Above Department Average Query (using active compensation view + correlated subquery)
SELECT
  v.employee_code,
  v.employee_name,
  v.department_name,
  v.designation_name,
  v.net_salary AS employee_salary,
  (
    SELECT ROUND(AVG(v2.net_salary), 2)
    FROM vw_employee_compensation v2
    WHERE v2.department_id = v.department_id
  ) AS department_avg_salary
FROM vw_employee_compensation v
WHERE v.net_salary > (
  SELECT AVG(v2.net_salary)
  FROM vw_employee_compensation v2
  WHERE v2.department_id = v.department_id
)
ORDER BY v.department_name, v.net_salary DESC;
