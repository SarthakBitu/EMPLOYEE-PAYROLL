-- ============================================================================
-- Employee Payroll Management System - Realistic Sample Dataset
-- Note: All names, emails, phones, and addresses are completely synthetic.
-- ============================================================================

USE employee_payroll_db;

-- 1. Departments (5)
INSERT INTO DEPARTMENT (department_id, department_name, description) VALUES
(1, 'HR', 'Human Resources, Talent Acquisition, and Employee Relations'),
(2, 'IT', 'Software Engineering, Infrastructure, and Information Security'),
(3, 'Finance', 'Corporate Accounting, Treasury, Auditing, and Payroll Control'),
(4, 'Marketing', 'Brand Strategy, Digital Campaigns, and Market Analytics'),
(5, 'Operations', 'Supply Chain, Logistics, Facilities, and Vendor Operations')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 2. Designations (10)
INSERT INTO DESIGNATION (designation_id, designation_name, description) VALUES
(1, 'HR Manager', 'Leads HR policy, compliance, and workforce planning'),
(2, 'Talent Acquisition Specialist', 'Manages technical and non-technical recruitment pipelines'),
(3, 'Senior Software Engineer', 'Architects core services and mentors engineering teams'),
(4, 'Software Engineer', 'Designs, builds, and maintains application modules'),
(5, 'DevOps Engineer', 'Automates CI/CD pipelines and cloud infrastructure'),
(6, 'Financial Analyst', 'Prepares budgets, forecasts, and variance reports'),
(7, 'Senior Accountant', 'Oversees general ledger, tax filings, and financial closes'),
(8, 'Marketing Strategist', 'Plans multi-channel brand positioning and product launches'),
(9, 'Growth Specialist', 'Optimizes acquisition funnels and conversion experiments'),
(10, 'Operations Coordinator', 'Coordinates daily logistics, SLA tracking, and procurement')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 3. Allowances (5)
INSERT INTO ALLOWANCE (allowance_id, allowance_name, allowance_type, default_amount, description) VALUES
(1, 'House Rent Allowance', 'PERCENTAGE', 20.00, 'Housing subsidy calculated as 20% of basic salary'),
(2, 'Dearness Allowance', 'PERCENTAGE', 10.00, 'Cost-of-living adjustment at 10% of basic salary'),
(3, 'Transport Allowance', 'FIXED', 200.00, 'Monthly commuting and transit reimbursement'),
(4, 'Medical Allowance', 'FIXED', 150.00, 'Routine healthcare and wellness stipend'),
(5, 'Performance Bonus', 'FIXED', 350.00, 'Monthly merit-based productivity allowance')
ON DUPLICATE KEY UPDATE default_amount = VALUES(default_amount);

-- 4. Deductions (4)
INSERT INTO DEDUCTION (deduction_id, deduction_name, deduction_type, default_amount, description) VALUES
(1, 'Provident Fund', 'PERCENTAGE', 8.00, 'Employee retirement contribution at 8% of basic salary'),
(2, 'Income Tax', 'PERCENTAGE', 10.00, 'Monthly statutory income tax withholding at 10% of basic salary'),
(3, 'Professional Tax', 'FIXED', 50.00, 'Monthly statutory professional tax levy'),
(4, 'Health Insurance', 'FIXED', 120.00, 'Group medical insurance premium share')
ON DUPLICATE KEY UPDATE default_amount = VALUES(default_amount);

-- 5. Employees (22 synthetic employees across 5 departments & 10 designations)
INSERT INTO EMPLOYEE (
  employee_id, employee_code, first_name, last_name, gender, date_of_birth,
  phone, email, address, hire_date, department_id, designation_id, employment_status
) VALUES
(1,  'EMP001', 'Aarav',    'Mehta',     'Male',   '1990-04-12', '555-0101', 'aarav.mehta@example.com',     '104 Maple Ridge Rd, Austin, TX',      '2021-03-15', 2, 3,  'ACTIVE'),
(2,  'EMP002', 'Priya',    'Nair',      'Female', '1993-08-24', '555-0102', 'priya.nair@example.com',      '218 Oakwood Ave, Austin, TX',       '2022-01-10', 2, 4,  'ACTIVE'),
(3,  'EMP003', 'Liam',     'OConnor',   'Male',   '1988-11-03', '555-0103', 'liam.oconnor@example.com',    '77 Cedar Creek Ln, Austin, TX',     '2020-07-01', 2, 5,  'ACTIVE'),
(4,  'EMP004', 'Sofia',    'Martinez',  'Female', '1995-02-19', '555-0104', 'sofia.martinez@example.com',  '405 Elm Street, Austin, TX',        '2023-04-12', 2, 4,  'ACTIVE'),
(5,  'EMP005', 'Ethan',    'Brooks',    'Male',   '1991-06-30', '555-0105', 'ethan.brooks@example.com',    '892 Pinecrest Dr, Austin, TX',      '2021-09-20', 2, 3,  'ACTIVE'),
(6,  'EMP006', 'Maya',     'Lin',       'Female', '1987-12-14', '555-0106', 'maya.lin@example.com',        '310 Willow Way, Austin, TX',        '2019-11-05', 1, 1,  'ACTIVE'),
(7,  'EMP007', 'Noah',     'Patel',     'Male',   '1994-05-22', '555-0107', 'noah.patel@example.com',      '512 Birch Blvd, Austin, TX',        '2022-06-18', 1, 2,  'ACTIVE'),
(8,  'EMP008', 'Chloe',    'Bennett',   'Female', '1996-09-09', '555-0108', 'chloe.bennett@example.com',   '640 Aspen Ct, Austin, TX',          '2024-02-01', 1, 2,  'ACTIVE'),
(9,  'EMP009', 'Vikram',   'Rao',       'Male',   '1989-03-17', '555-0109', 'vikram.rao@example.com',      '155 Cypress St, Austin, TX',        '2020-05-11', 3, 7,  'ACTIVE'),
(10, 'EMP010', 'Hannah',   'Kim',       'Female', '1992-07-28', '555-0110', 'hannah.kim@example.com',      '920 Magnolia Dr, Austin, TX',       '2022-08-22', 3, 6,  'ACTIVE'),
(11, 'EMP011', 'Lucas',    'Wright',    'Male',   '1994-01-15', '555-0111', 'lucas.wright@example.com',    '448 Spruce Ave, Austin, TX',        '2023-01-16', 3, 6,  'ACTIVE'),
(12, 'EMP012', 'Ananya',   'Sharma',    'Female', '1990-10-06', '555-0112', 'ananya.sharma@example.com',   '731 Redwood Ter, Austin, TX',       '2021-04-05', 3, 7,  'ACTIVE'),
(13, 'EMP013', 'Daniel',   'Foster',    'Male',   '1991-12-01', '555-0113', 'daniel.foster@example.com',   '289 Sycamore Ln, Austin, TX',       '2021-10-14', 4, 8,  'ACTIVE'),
(14, 'EMP014', 'Elena',    'Rossi',     'Female', '1995-03-25', '555-0114', 'elena.rossi@example.com',     '615 Chestnut Rd, Austin, TX',       '2023-07-10', 4, 9,  'ACTIVE'),
(15, 'EMP015', 'Caleb',    'Morgan',    'Male',   '1993-11-18', '555-0115', 'caleb.morgan@example.com',    '803 Juniper Way, Austin, TX',       '2022-09-01', 4, 8,  'ACTIVE'),
(16, 'EMP016', 'Zoe',      'Harper',    'Female', '1997-04-08', '555-0116', 'zoe.harper@example.com',      '119 Laurel Path, Austin, TX',       '2024-05-15', 4, 9,  'ACTIVE'),
(17, 'EMP017', 'Rohan',    'Desai',     'Male',   '1988-09-12', '555-0117', 'rohan.desai@example.com',     '354 Hickory Pl, Austin, TX',        '2020-02-19', 5, 10, 'ACTIVE'),
(18, 'EMP018', 'Grace',    'Sullivan',  'Female', '1992-06-04', '555-0118', 'grace.sullivan@example.com',  '482 Alder St, Austin, TX',          '2022-11-07', 5, 10, 'ACTIVE'),
(19, 'EMP019', 'Owen',     'Hayes',     'Male',   '1995-08-19', '555-0119', 'owen.hayes@example.com',      '590 Hawthorn Rd, Austin, TX',       '2023-09-11', 5, 10, 'ACTIVE'),
(20, 'EMP020', 'Nadia',    'Alvarez',   'Female', '1991-01-27', '555-0120', 'nadia.alvarez@example.com',   '776 Poplar Ave, Austin, TX',        '2021-06-03', 5, 10, 'ACTIVE'),
(21, 'EMP021', 'Marcus',   'Reed',      'Male',   '1989-07-11', '555-0121', 'marcus.reed@example.com',     '201 Sequoia Dr, Austin, TX',        '2020-10-01', 2, 4,  'INACTIVE'),
(22, 'EMP022', 'Tara',     'Jenkins',   'Female', '1993-02-23', '555-0122', 'tara.jenkins@example.com',    '940 Dogwood Ln, Austin, TX',        '2021-12-12', 4, 9,  'TERMINATED')
ON DUPLICATE KEY UPDATE employment_status = VALUES(employment_status);

-- 6. Salary Structures for all 20 active employees (distinct tiers inside each dept for realistic AVG comparisons)
INSERT INTO SALARY_STRUCTURE (salary_structure_id, employee_id, basic_salary, effective_from, status) VALUES
(1,  1,  7800.00, '2025-01-01', 'ACTIVE'),
(2,  2,  5400.00, '2025-01-01', 'ACTIVE'),
(3,  3,  6900.00, '2025-01-01', 'ACTIVE'),
(4,  4,  4900.00, '2025-01-01', 'ACTIVE'),
(5,  5,  7400.00, '2025-01-01', 'ACTIVE'),
(6,  6,  6400.00, '2025-01-01', 'ACTIVE'),
(7,  7,  4300.00, '2025-01-01', 'ACTIVE'),
(8,  8,  3900.00, '2025-01-01', 'ACTIVE'),
(9,  9,  6800.00, '2025-01-01', 'ACTIVE'),
(10, 10, 5100.00, '2025-01-01', 'ACTIVE'),
(11, 11, 4700.00, '2025-01-01', 'ACTIVE'),
(12, 12, 6500.00, '2025-01-01', 'ACTIVE'),
(13, 13, 5900.00, '2025-01-01', 'ACTIVE'),
(14, 14, 4400.00, '2025-01-01', 'ACTIVE'),
(15, 15, 5600.00, '2025-01-01', 'ACTIVE'),
(16, 16, 4100.00, '2025-01-01', 'ACTIVE'),
(17, 17, 5200.00, '2025-01-01', 'ACTIVE'),
(18, 18, 4600.00, '2025-01-01', 'ACTIVE'),
(19, 19, 4100.00, '2025-01-01', 'ACTIVE'),
(20, 20, 4800.00, '2025-01-01', 'ACTIVE')
ON DUPLICATE KEY UPDATE basic_salary = VALUES(basic_salary);

-- 7. Normalized Salary Allowances (HRA 20%, DA 10%, Transport $200, Medical $150, plus Bonus $350 for senior staff)
INSERT IGNORE INTO SALARY_ALLOWANCE (salary_structure_id, allowance_id, amount)
SELECT ss.salary_structure_id, 1, ROUND(ss.basic_salary * 0.20, 2) FROM SALARY_STRUCTURE ss;

INSERT IGNORE INTO SALARY_ALLOWANCE (salary_structure_id, allowance_id, amount)
SELECT ss.salary_structure_id, 2, ROUND(ss.basic_salary * 0.10, 2) FROM SALARY_STRUCTURE ss;

INSERT IGNORE INTO SALARY_ALLOWANCE (salary_structure_id, allowance_id, amount)
SELECT ss.salary_structure_id, 3, 200.00 FROM SALARY_STRUCTURE ss;

INSERT IGNORE INTO SALARY_ALLOWANCE (salary_structure_id, allowance_id, amount)
SELECT ss.salary_structure_id, 4, 150.00 FROM SALARY_STRUCTURE ss;

INSERT IGNORE INTO SALARY_ALLOWANCE (salary_structure_id, allowance_id, amount)
SELECT ss.salary_structure_id, 5, 350.00 FROM SALARY_STRUCTURE ss WHERE ss.basic_salary >= 6000.00;

-- 8. Normalized Salary Deductions (PF 8%, Income Tax 10%, Professional Tax $50, Health Insurance $120)
INSERT IGNORE INTO SALARY_DEDUCTION (salary_structure_id, deduction_id, amount)
SELECT ss.salary_structure_id, 1, ROUND(ss.basic_salary * 0.08, 2) FROM SALARY_STRUCTURE ss;

INSERT IGNORE INTO SALARY_DEDUCTION (salary_structure_id, deduction_id, amount)
SELECT ss.salary_structure_id, 2, ROUND(ss.basic_salary * 0.10, 2) FROM SALARY_STRUCTURE ss;

INSERT IGNORE INTO SALARY_DEDUCTION (salary_structure_id, deduction_id, amount)
SELECT ss.salary_structure_id, 3, 50.00 FROM SALARY_STRUCTURE ss;

INSERT IGNORE INTO SALARY_DEDUCTION (salary_structure_id, deduction_id, amount)
SELECT ss.salary_structure_id, 4, 120.00 FROM SALARY_STRUCTURE ss;

-- 9. Daily Attendance for September 2026, October 2026, and November 2026 (up to Nov 20)
-- Generates realistic weekday attendance (Mon-Fri) for all 20 active employees
INSERT IGNORE INTO ATTENDANCE (employee_id, attendance_date, status, working_hours, overtime_hours, remarks)
SELECT
  e.employee_id,
  cal.dt AS attendance_date,
  CASE
    WHEN DAYOFMONTH(cal.dt) = 15 AND e.employee_id IN (4, 11, 16) THEN 'LEAVE'
    WHEN DAYOFMONTH(cal.dt) = 22 AND e.employee_id IN (7, 19) THEN 'ABSENT'
    WHEN DAYOFMONTH(cal.dt) = 8 AND e.employee_id IN (2, 14) THEN 'HALF_DAY'
    ELSE 'PRESENT'
  END AS status,
  CASE
    WHEN DAYOFMONTH(cal.dt) = 15 AND e.employee_id IN (4, 11, 16) THEN 0.00
    WHEN DAYOFMONTH(cal.dt) = 22 AND e.employee_id IN (7, 19) THEN 0.00
    WHEN DAYOFMONTH(cal.dt) = 8 AND e.employee_id IN (2, 14) THEN 4.00
    ELSE 8.00
  END AS working_hours,
  CASE
    WHEN DAYOFMONTH(cal.dt) IN (4, 12, 19) AND e.employee_id IN (1, 3, 5, 9, 13, 17) THEN 2.00
    WHEN DAYOFMONTH(cal.dt) = 10 AND e.employee_id IN (2, 10, 15, 20) THEN 1.50
    ELSE 0.00
  END AS overtime_hours,
  CASE
    WHEN DAYOFMONTH(cal.dt) = 15 AND e.employee_id IN (4, 11, 16) THEN 'Approved personal leave'
    WHEN DAYOFMONTH(cal.dt) = 22 AND e.employee_id IN (7, 19) THEN 'Unplanned absence'
    WHEN DAYOFMONTH(cal.dt) = 8 AND e.employee_id IN (2, 14) THEN 'Half-day medical appointment'
    WHEN DAYOFMONTH(cal.dt) IN (4, 12, 19) AND e.employee_id IN (1, 3, 5, 9, 13, 17) THEN 'Sprint / month-end overtime'
    ELSE 'Regular shift'
  END AS remarks
FROM EMPLOYEE e
CROSS JOIN (
  SELECT DATE_ADD('2026-09-01', INTERVAL seq.n DAY) AS dt
  FROM (
    SELECT a.N + b.N * 10 AS n
    FROM (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
    CROSS JOIN (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) b
  ) seq
  WHERE DATE_ADD('2026-09-01', INTERVAL seq.n DAY) <= '2026-11-20'
    AND DAYOFWEEK(DATE_ADD('2026-09-01', INTERVAL seq.n DAY)) NOT IN (1, 7)
) cal
WHERE e.employment_status = 'ACTIVE';

-- 10. Generate Sample Payroll for September 2026 & October 2026 using Stored Procedure
-- (Leaves November 2026 ready for live payroll generation in the application)
CALL sp_generate_monthly_payroll(9, 2026, @sep_count);
UPDATE PAYROLL SET payroll_status = 'PAID' WHERE payroll_month = 9 AND payroll_year = 2026;

CALL sp_generate_monthly_payroll(10, 2026, @oct_count);
