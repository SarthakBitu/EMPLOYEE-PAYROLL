-- ============================================================================
-- Employee Payroll Management System - Stored Procedures
-- ============================================================================

USE employee_payroll_db;

DROP PROCEDURE IF EXISTS sp_generate_monthly_payroll;

DELIMITER $$

-- Procedure: sp_generate_monthly_payroll
-- Parameters:
--   p_month INT: Target payroll month (1..12)
--   p_year  INT: Target payroll year (2000..2100)
--   p_generated_count OUT INT: Number of payroll records inserted
-- Description:
--   Atomically generates monthly payroll for all ACTIVE employees with an ACTIVE
--   salary structure using DECIMAL calculations, attendance metrics, and
--   allowances/deductions. Prevents duplicate payroll for the same period and
--   automatically rolls back on any SQL exception.
CREATE PROCEDURE sp_generate_monthly_payroll(
  IN p_month INT,
  IN p_year INT,
  OUT p_generated_count INT
)
BEGIN
  DECLARE v_existing_count INT DEFAULT 0;
  DECLARE v_eligible_count INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_generated_count = 0;

  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid payroll month: must be between 1 and 12';
  END IF;

  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid payroll year: must be between 2000 and 2100';
  END IF;

  START TRANSACTION;

  -- Lock period check to prevent concurrent duplicate generation
  SELECT COUNT(*) INTO v_existing_count
  FROM PAYROLL
  WHERE payroll_month = p_month AND payroll_year = p_year
  FOR UPDATE;

  IF v_existing_count > 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Duplicate payroll blocked: Payroll has already been generated for this month and year';
  END IF;

  SELECT COUNT(*) INTO v_eligible_count
  FROM EMPLOYEE e
  INNER JOIN SALARY_STRUCTURE ss
    ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
  WHERE e.employment_status = 'ACTIVE';

  IF v_eligible_count = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No active employees with active salary structures available for payroll generation';
  END IF;

  -- Overtime rate = (basic_salary / 160.00) * 1.50 (standard 20-day x 8-hour month)
  INSERT INTO PAYROLL (
    employee_id,
    payroll_month,
    payroll_year,
    basic_salary,
    total_allowance,
    overtime_pay,
    gross_salary,
    total_deduction,
    net_salary,
    working_days,
    present_days,
    leave_days,
    absent_days,
    overtime_hours,
    payroll_status
  )
  SELECT
    e.employee_id,
    p_month,
    p_year,
    ss.basic_salary,
    COALESCE(al.total_allowance, 0.00) AS total_allowance,
    ROUND(
      COALESCE(att.overtime_hours, 0.00) * ROUND((ss.basic_salary / 160.00) * 1.50, 2),
      2
    ) AS overtime_pay,
    ROUND(
      ss.basic_salary + COALESCE(al.total_allowance, 0.00) +
      ROUND(COALESCE(att.overtime_hours, 0.00) * ROUND((ss.basic_salary / 160.00) * 1.50, 2), 2),
      2
    ) AS gross_salary,
    COALESCE(ded.total_deduction, 0.00) AS total_deduction,
    ROUND(
      (
        ss.basic_salary + COALESCE(al.total_allowance, 0.00) +
        ROUND(COALESCE(att.overtime_hours, 0.00) * ROUND((ss.basic_salary / 160.00) * 1.50, 2), 2)
      ) - COALESCE(ded.total_deduction, 0.00),
      2
    ) AS net_salary,
    COALESCE(att.working_days, 0) AS working_days,
    COALESCE(att.present_days, 0) AS present_days,
    COALESCE(att.leave_days, 0) AS leave_days,
    COALESCE(att.absent_days, 0) AS absent_days,
    COALESCE(att.overtime_hours, 0.00) AS overtime_hours,
    'GENERATED' AS payroll_status
  FROM EMPLOYEE e
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
  ) ded ON ss.salary_structure_id = ded.salary_structure_id
  LEFT JOIN (
    SELECT
      employee_id,
      SUM(CASE WHEN status <> 'HOLIDAY' THEN 1 ELSE 0 END) AS working_days,
      SUM(CASE WHEN status IN ('PRESENT', 'HALF_DAY') THEN 1 ELSE 0 END) AS present_days,
      SUM(CASE WHEN status = 'LEAVE' THEN 1 ELSE 0 END) AS leave_days,
      SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
      ROUND(SUM(overtime_hours), 2) AS overtime_hours
    FROM ATTENDANCE
    WHERE MONTH(attendance_date) = p_month
      AND YEAR(attendance_date) = p_year
    GROUP BY employee_id
  ) att ON e.employee_id = att.employee_id
  WHERE e.employment_status = 'ACTIVE';

  SET p_generated_count = ROW_COUNT();

  COMMIT;
END$$

DELIMITER ;
