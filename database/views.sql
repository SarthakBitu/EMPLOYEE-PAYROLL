-- ============================================================================
-- Employee Payroll Management System - SQL Views
-- ============================================================================

USE employee_payroll_db;

-- View 1: Comprehensive Payroll View joining Employee, Department, Designation, and Payroll
CREATE OR REPLACE VIEW vw_employee_payroll AS
SELECT
  p.payroll_id,
  p.employee_id,
  e.employee_code,
  TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
  e.email AS employee_email,
  e.employment_status,
  d.department_id,
  d.department_name,
  des.designation_id,
  des.designation_name,
  p.payroll_month,
  p.payroll_year,
  p.basic_salary,
  p.total_allowance,
  p.overtime_pay,
  p.gross_salary,
  p.total_deduction,
  p.net_salary,
  p.working_days,
  p.present_days,
  p.leave_days,
  p.absent_days,
  p.overtime_hours,
  p.payroll_status,
  p.generated_at
FROM PAYROLL p
INNER JOIN EMPLOYEE e ON p.employee_id = e.employee_id
INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id;

-- View 2: Current Active Compensation View (joins active Salary Structure + Allowances + Deductions)
CREATE OR REPLACE VIEW vw_employee_compensation AS
SELECT
  e.employee_id,
  e.employee_code,
  TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
  e.email,
  e.hire_date,
  e.employment_status,
  d.department_id,
  d.department_name,
  des.designation_id,
  des.designation_name,
  ss.salary_structure_id,
  ss.basic_salary,
  ss.effective_from,
  COALESCE(al.total_allowance, 0.00) AS total_allowance,
  COALESCE(ded.total_deduction, 0.00) AS total_deduction,
  ROUND(ss.basic_salary + COALESCE(al.total_allowance, 0.00), 2) AS gross_salary,
  ROUND((ss.basic_salary + COALESCE(al.total_allowance, 0.00)) - COALESCE(ded.total_deduction, 0.00), 2) AS net_salary
FROM EMPLOYEE e
INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
INNER JOIN SALARY_STRUCTURE ss
  ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
LEFT JOIN (
  SELECT salary_structure_id, ROUND(SUM(amount), 2) AS total_allowance
  FROM SALARY_ALLOWANCE
  GROUP BY salary_structure_id
) al ON ss.salary_structure_id = al.salary_structure_id
LEFT JOIN (
  SELECT salary_structure_id, ROUND(SUM(amount), 2) AS total_deduction
  FROM SALARY_DEDUCTION
  GROUP BY salary_structure_id
) ded ON ss.salary_structure_id = ded.salary_structure_id;
