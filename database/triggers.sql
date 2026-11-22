-- ============================================================================
-- Employee Payroll Management System - SQL Triggers
-- ============================================================================

USE employee_payroll_db;

DROP TRIGGER IF EXISTS before_payroll_insert;
DROP TRIGGER IF EXISTS before_payroll_update;
DROP TRIGGER IF EXISTS before_salary_structure_insert;

DELIMITER $$

-- Trigger 1: before_payroll_insert
-- Purpose: Enforces monetary integrity and non-negativity before inserting any payroll record.
-- Checks basic_salary, total_allowance, total_deduction, gross_salary, net_salary >= 0,
-- gross_salary = basic_salary + total_allowance + overtime_pay,
-- and net_salary = gross_salary - total_deduction.
CREATE TRIGGER before_payroll_insert
BEFORE INSERT ON PAYROLL
FOR EACH ROW
BEGIN
  IF NEW.payroll_month < 1 OR NEW.payroll_month > 12 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid payroll_month: must be between 1 and 12';
  END IF;

  IF NEW.payroll_year < 2000 OR NEW.payroll_year > 2100 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid payroll_year: must be between 2000 and 2100';
  END IF;

  IF NEW.basic_salary < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll validation failed: basic_salary must be >= 0';
  END IF;

  IF NEW.total_allowance < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll validation failed: total_allowance must be >= 0';
  END IF;

  IF NEW.overtime_pay < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll validation failed: overtime_pay must be >= 0';
  END IF;

  IF NEW.total_deduction < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll validation failed: total_deduction must be >= 0';
  END IF;

  IF NEW.gross_salary < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll validation failed: gross_salary must be >= 0';
  END IF;

  IF NEW.net_salary < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll validation failed: net_salary must be >= 0';
  END IF;

  IF ROUND(NEW.gross_salary, 2) <> ROUND(NEW.basic_salary + NEW.total_allowance + NEW.overtime_pay, 2) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll consistency error: gross_salary must equal basic_salary + total_allowance + overtime_pay';
  END IF;

  IF ROUND(NEW.net_salary, 2) <> ROUND(NEW.gross_salary - NEW.total_deduction, 2) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll consistency error: net_salary must equal gross_salary - total_deduction';
  END IF;
END$$

-- Trigger 2: before_payroll_update
-- Purpose: Preserves consistency on updates and protects PAID payroll records from tampering.
CREATE TRIGGER before_payroll_update
BEFORE UPDATE ON PAYROLL
FOR EACH ROW
BEGIN
  IF OLD.payroll_status = 'PAID' AND (
    NEW.basic_salary <> OLD.basic_salary OR
    NEW.total_allowance <> OLD.total_allowance OR
    NEW.overtime_pay <> OLD.overtime_pay OR
    NEW.gross_salary <> OLD.gross_salary OR
    NEW.total_deduction <> OLD.total_deduction OR
    NEW.net_salary <> OLD.net_salary
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll lock error: Cannot modify monetary amounts of a PAID payroll record';
  END IF;

  IF NEW.basic_salary < 0 OR NEW.total_allowance < 0 OR NEW.total_deduction < 0 OR NEW.gross_salary < 0 OR NEW.net_salary < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll validation failed: salary components cannot be negative';
  END IF;

  IF ROUND(NEW.net_salary, 2) <> ROUND(NEW.gross_salary - NEW.total_deduction, 2) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payroll consistency error: net_salary must equal gross_salary - total_deduction';
  END IF;
END$$

-- Trigger 3: before_salary_structure_insert
-- Purpose: Ensures basic_salary is non-negative and date ranges are valid on insertion.
CREATE TRIGGER before_salary_structure_insert
BEFORE INSERT ON SALARY_STRUCTURE
FOR EACH ROW
BEGIN
  IF NEW.basic_salary < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Salary structure error: basic_salary cannot be negative';
  END IF;

  IF NEW.effective_to IS NOT NULL AND NEW.effective_to < NEW.effective_from THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Salary structure error: effective_to cannot be earlier than effective_from';
  END IF;
END$$

DELIMITER ;
