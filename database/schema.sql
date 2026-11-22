-- ============================================================================
-- Employee Payroll Management System - Database Schema (MySQL 8+ / MariaDB 10+)
-- Normalized to Third Normal Form (3NF)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS employee_payroll_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE employee_payroll_db;

-- 1. ADMIN_USER: System administrators authenticated via bcrypt + JWT
CREATE TABLE IF NOT EXISTS ADMIN_USER (
  admin_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'HR_MANAGER') NOT NULL DEFAULT 'ADMIN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. DEPARTMENT: Organizational departments (1:M with EMPLOYEE)
CREATE TABLE IF NOT EXISTS DEPARTMENT (
  department_id INT PRIMARY KEY AUTO_INCREMENT,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. DESIGNATION: Job roles / titles (1:M with EMPLOYEE)
CREATE TABLE IF NOT EXISTS DESIGNATION (
  designation_id INT PRIMARY KEY AUTO_INCREMENT,
  designation_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. EMPLOYEE: Core employee master table
CREATE TABLE IF NOT EXISTS EMPLOYEE (
  employee_id INT PRIMARY KEY AUTO_INCREMENT,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50),
  gender VARCHAR(20),
  date_of_birth DATE,
  phone VARCHAR(20),
  email VARCHAR(100) UNIQUE,
  address TEXT,
  hire_date DATE NOT NULL,
  department_id INT NOT NULL,
  designation_id INT NOT NULL,
  employment_status ENUM('ACTIVE', 'INACTIVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_department
    FOREIGN KEY (department_id) REFERENCES DEPARTMENT(department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_employee_designation
    FOREIGN KEY (designation_id) REFERENCES DESIGNATION(designation_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. ATTENDANCE: Daily attendance log per employee (1:M with EMPLOYEE)
CREATE TABLE IF NOT EXISTS ATTENDANCE (
  attendance_id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY') NOT NULL,
  working_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  remarks VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_employee_date (employee_id, attendance_date),
  CONSTRAINT fk_attendance_employee
    FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(employee_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. SALARY_STRUCTURE: Employee compensation structure history
CREATE TABLE IF NOT EXISTS SALARY_STRUCTURE (
  salary_structure_id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_salary_structure_employee
    FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(employee_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_basic_salary_non_negative CHECK (basic_salary >= 0)
) ENGINE=InnoDB;

-- 7. ALLOWANCE: Master catalog of allowance types (atomic, 3NF)
CREATE TABLE IF NOT EXISTS ALLOWANCE (
  allowance_id INT PRIMARY KEY AUTO_INCREMENT,
  allowance_name VARCHAR(100) NOT NULL UNIQUE,
  allowance_type ENUM('FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED',
  default_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255)
) ENGINE=InnoDB;

-- 8. DEDUCTION: Master catalog of deduction types (atomic, 3NF)
CREATE TABLE IF NOT EXISTS DEDUCTION (
  deduction_id INT PRIMARY KEY AUTO_INCREMENT,
  deduction_name VARCHAR(100) NOT NULL UNIQUE,
  deduction_type ENUM('FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED',
  default_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255)
) ENGINE=InnoDB;

-- 9. SALARY_ALLOWANCE: Junction table resolving M:N between SALARY_STRUCTURE and ALLOWANCE
CREATE TABLE IF NOT EXISTS SALARY_ALLOWANCE (
  salary_allowance_id INT PRIMARY KEY AUTO_INCREMENT,
  salary_structure_id INT NOT NULL,
  allowance_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE KEY uq_salary_allowance (salary_structure_id, allowance_id),
  CONSTRAINT fk_sa_salary_structure
    FOREIGN KEY (salary_structure_id) REFERENCES SALARY_STRUCTURE(salary_structure_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sa_allowance
    FOREIGN KEY (allowance_id) REFERENCES ALLOWANCE(allowance_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 10. SALARY_DEDUCTION: Junction table resolving M:N between SALARY_STRUCTURE and DEDUCTION
CREATE TABLE IF NOT EXISTS SALARY_DEDUCTION (
  salary_deduction_id INT PRIMARY KEY AUTO_INCREMENT,
  salary_structure_id INT NOT NULL,
  deduction_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  UNIQUE KEY uq_salary_deduction (salary_structure_id, deduction_id),
  CONSTRAINT fk_sd_salary_structure
    FOREIGN KEY (salary_structure_id) REFERENCES SALARY_STRUCTURE(salary_structure_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sd_deduction
    FOREIGN KEY (deduction_id) REFERENCES DEDUCTION(deduction_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 11. PAYROLL: Monthly generated payroll ledger
CREATE TABLE IF NOT EXISTS PAYROLL (
  payroll_id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  payroll_month INT NOT NULL,
  payroll_year INT NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  total_allowance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  overtime_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gross_salary DECIMAL(12,2) NOT NULL,
  total_deduction DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_salary DECIMAL(12,2) NOT NULL,
  working_days INT NOT NULL DEFAULT 0,
  present_days INT NOT NULL DEFAULT 0,
  leave_days INT NOT NULL DEFAULT 0,
  absent_days INT NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  payroll_status ENUM('DRAFT', 'GENERATED', 'PAID') NOT NULL DEFAULT 'GENERATED',
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payroll_employee_period (employee_id, payroll_month, payroll_year),
  CONSTRAINT fk_payroll_employee
    FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(employee_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- INDEXES FOR QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX idx_employee_department ON EMPLOYEE(department_id);
CREATE INDEX idx_employee_designation ON EMPLOYEE(designation_id);
CREATE INDEX idx_employee_status ON EMPLOYEE(employment_status);
CREATE INDEX idx_attendance_employee ON ATTENDANCE(employee_id);
CREATE INDEX idx_attendance_date ON ATTENDANCE(attendance_date);
CREATE INDEX idx_payroll_employee ON PAYROLL(employee_id);
CREATE INDEX idx_payroll_month_year ON PAYROLL(payroll_year, payroll_month);
CREATE INDEX idx_salary_employee ON SALARY_STRUCTURE(employee_id);
