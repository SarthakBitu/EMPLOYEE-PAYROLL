import type { RowDataPacket } from 'mysql2/promise';
import { query } from '../config/db.ts';

export async function getDashboardSummary() {
  const [empStats] = await query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total_employees,
       SUM(CASE WHEN employment_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_employees
     FROM EMPLOYEE`
  );

  const [deptStats] = await query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total_departments FROM DEPARTMENT'
  );

  const [desigStats] = await query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total_designations FROM DESIGNATION'
  );

  // Latest available payroll period for summary KPIs
  const latestPeriodRows = await query<RowDataPacket[]>(
    `SELECT payroll_month, payroll_year
     FROM PAYROLL
     ORDER BY payroll_year DESC, payroll_month DESC
     LIMIT 1`
  );

  const targetMonth = latestPeriodRows[0]?.payroll_month ?? new Date().getMonth() + 1;
  const targetYear = latestPeriodRows[0]?.payroll_year ?? new Date().getFullYear();

  const [payrollTotals] = await query<RowDataPacket[]>(
    `SELECT
       COALESCE(ROUND(SUM(gross_salary), 2), 0.00) AS current_month_gross,
       COALESCE(ROUND(SUM(total_deduction), 2), 0.00) AS current_month_deduction,
       COALESCE(ROUND(SUM(net_salary), 2), 0.00) AS current_month_net
     FROM PAYROLL
     WHERE payroll_month = ? AND payroll_year = ?`,
    [targetMonth, targetYear]
  );

  // Chart 1: Employees by Department
  const employeesByDepartment = await query<RowDataPacket[]>(
    `SELECT
       d.department_name AS department,
       COUNT(e.employee_id) AS total_employees,
       SUM(CASE WHEN e.employment_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_employees
     FROM DEPARTMENT d
     LEFT JOIN EMPLOYEE e ON d.department_id = e.department_id
     GROUP BY d.department_id, d.department_name
     ORDER BY total_employees DESC`
  );

  // Chart 2: Salary by Department (from active compensation or latest payroll)
  const salaryByDepartment = await query<RowDataPacket[]>(
    `SELECT
       d.department_name AS department,
       COALESCE(ROUND(SUM(v.gross_salary), 2), 0.00) AS total_gross,
       COALESCE(ROUND(SUM(v.net_salary), 2), 0.00) AS total_net,
       COALESCE(ROUND(AVG(v.net_salary), 2), 0.00) AS avg_net
     FROM DEPARTMENT d
     LEFT JOIN vw_employee_compensation v ON d.department_id = v.department_id
     GROUP BY d.department_id, d.department_name
     ORDER BY total_net DESC`
  );

  // Chart 3: Monthly Payroll Trend
  const monthlyPayrollTrend = await query<RowDataPacket[]>(
    `SELECT
       payroll_year,
       payroll_month,
       CONCAT(payroll_year, '-', LPAD(payroll_month, 2, '0')) AS period,
       ROUND(SUM(gross_salary), 2) AS total_gross,
       ROUND(SUM(total_deduction), 2) AS total_deduction,
       ROUND(SUM(net_salary), 2) AS total_net
     FROM PAYROLL
     GROUP BY payroll_year, payroll_month
     ORDER BY payroll_year ASC, payroll_month ASC
     LIMIT 12`
  );

  // Chart 4: Attendance Summary (for latest logged attendance month)
  const latestAttRows = await query<RowDataPacket[]>(
    `SELECT MONTH(MAX(attendance_date)) AS att_month, YEAR(MAX(attendance_date)) AS att_year
     FROM ATTENDANCE`
  );
  const attMonth = latestAttRows[0]?.att_month ?? targetMonth;
  const attYear = latestAttRows[0]?.att_year ?? targetYear;

  const attendanceSummary = await query<RowDataPacket[]>(
    `SELECT
       status,
       COUNT(*) AS count
     FROM ATTENDANCE
     WHERE MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
     GROUP BY status
     ORDER BY count DESC`,
    [attMonth, attYear]
  );

  return {
    kpis: {
      totalEmployees: Number(empStats?.total_employees || 0),
      activeEmployees: Number(empStats?.active_employees || 0),
      totalDepartments: Number(deptStats?.total_departments || 0),
      totalDesignations: Number(desigStats?.total_designations || 0),
      currentMonthGross: Number(payrollTotals?.current_month_gross || 0),
      currentMonthDeduction: Number(payrollTotals?.current_month_deduction || 0),
      currentMonthNet: Number(payrollTotals?.current_month_net || 0),
      payrollPeriod: { month: Number(targetMonth), year: Number(targetYear) },
      attendancePeriod: { month: Number(attMonth), year: Number(attYear) },
    },
    charts: {
      employeesByDepartment,
      salaryByDepartment,
      monthlyPayrollTrend,
      attendanceSummary,
    },
  };
}

export async function getDepartmentSalaryReport(filters: {
  month?: number;
  year?: number;
  minEmployees?: number;
}) {
  if (filters.month && filters.year) {
    const havingClause = filters.minEmployees ? 'HAVING COUNT(p.payroll_id) >= ?' : '';
    const params: unknown[] = [filters.month, filters.year];
    if (filters.minEmployees) params.push(filters.minEmployees);

    return query<RowDataPacket[]>(
      `SELECT
         d.department_id,
         d.department_name AS department,
         COUNT(p.payroll_id) AS employee_count,
         ROUND(SUM(p.basic_salary), 2) AS total_basic,
         ROUND(SUM(p.total_allowance), 2) AS total_allowance,
         ROUND(SUM(p.overtime_pay), 2) AS total_overtime,
         ROUND(SUM(p.gross_salary), 2) AS total_gross,
         ROUND(SUM(p.total_deduction), 2) AS total_deduction,
         ROUND(SUM(p.net_salary), 2) AS total_net,
         ROUND(AVG(p.net_salary), 2) AS average_salary
       FROM DEPARTMENT d
       INNER JOIN EMPLOYEE e ON d.department_id = e.department_id
       INNER JOIN PAYROLL p ON e.employee_id = p.employee_id
       WHERE p.payroll_month = ? AND p.payroll_year = ?
       GROUP BY d.department_id, d.department_name
       ${havingClause}
       ORDER BY total_net DESC`,
      params
    );
  }

  const havingClause = filters.minEmployees ? 'HAVING COUNT(v.employee_id) >= ?' : '';
  const params: unknown[] = filters.minEmployees ? [filters.minEmployees] : [];

  return query<RowDataPacket[]>(
    `SELECT
       d.department_id,
       d.department_name AS department,
       COUNT(v.employee_id) AS employee_count,
       COALESCE(ROUND(SUM(v.basic_salary), 2), 0.00) AS total_basic,
       COALESCE(ROUND(SUM(v.total_allowance), 2), 0.00) AS total_allowance,
       0.00 AS total_overtime,
       COALESCE(ROUND(SUM(v.gross_salary), 2), 0.00) AS total_gross,
       COALESCE(ROUND(SUM(v.total_deduction), 2), 0.00) AS total_deduction,
       COALESCE(ROUND(SUM(v.net_salary), 2), 0.00) AS total_net,
       COALESCE(ROUND(AVG(v.net_salary), 2), 0.00) AS average_salary
     FROM DEPARTMENT d
     INNER JOIN vw_employee_compensation v ON d.department_id = v.department_id
     GROUP BY d.department_id, d.department_name
     ${havingClause}
     ORDER BY total_net DESC`,
    params
  );
}

export async function getEmployeeSalaryReport(filters: {
  month?: number;
  year?: number;
  department_id?: number;
}) {
  if (filters.month && filters.year) {
    const conditions = ['payroll_month = ?', 'payroll_year = ?'];
    const params: unknown[] = [filters.month, filters.year];
    if (filters.department_id) {
      conditions.push('department_id = ?');
      params.push(filters.department_id);
    }
    return query<RowDataPacket[]>(
      `SELECT * FROM vw_employee_payroll
       WHERE ${conditions.join(' AND ')}
       ORDER BY department_name ASC, net_salary DESC`,
      params
    );
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.department_id) {
    conditions.push('department_id = ?');
    params.push(filters.department_id);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return query<RowDataPacket[]>(
    `SELECT * FROM vw_employee_compensation
     ${whereClause}
     ORDER BY department_name ASC, net_salary DESC`,
    params
  );
}

export async function getAttendanceReport(filters: {
  month: number;
  year: number;
  department_id?: number;
}) {
  const params: unknown[] = [filters.month, filters.year];
  let deptClause = '';
  if (filters.department_id) {
    deptClause = 'AND e.department_id = ?';
    params.push(filters.department_id);
  }

  return query<RowDataPacket[]>(
    `SELECT
       e.employee_id,
       e.employee_code,
       TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
       d.department_name,
       des.designation_name,
       COUNT(a.attendance_id) AS total_logged_days,
       SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_days,
       SUM(CASE WHEN a.status = 'HALF_DAY' THEN 1 ELSE 0 END) AS half_days,
       SUM(CASE WHEN a.status = 'LEAVE' THEN 1 ELSE 0 END) AS leave_days,
       SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
       SUM(CASE WHEN a.status = 'HOLIDAY' THEN 1 ELSE 0 END) AS holidays,
       ROUND(COALESCE(SUM(a.working_hours), 0), 2) AS total_working_hours,
       ROUND(COALESCE(SUM(a.overtime_hours), 0), 2) AS total_overtime_hours
     FROM EMPLOYEE e
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
     LEFT JOIN ATTENDANCE a
       ON e.employee_id = a.employee_id
       AND MONTH(a.attendance_date) = ?
       AND YEAR(a.attendance_date) = ?
     WHERE e.employment_status = 'ACTIVE' ${deptClause}
     GROUP BY e.employee_id, e.employee_code, e.first_name, e.last_name, d.department_name, des.designation_name
     ORDER BY d.department_name ASC, e.employee_code ASC`,
    params
  );
}

export async function getMonthlyPayrollReport(year?: number) {
  const params: unknown[] = [];
  const whereClause = year ? 'WHERE payroll_year = ?' : '';
  if (year) params.push(year);

  return query<RowDataPacket[]>(
    `SELECT
       payroll_year,
       payroll_month,
       COUNT(payroll_id) AS employee_count,
       ROUND(SUM(basic_salary), 2) AS total_basic,
       ROUND(SUM(total_allowance), 2) AS total_allowance,
       ROUND(SUM(overtime_pay), 2) AS total_overtime,
       ROUND(SUM(gross_salary), 2) AS total_gross,
       ROUND(SUM(total_deduction), 2) AS total_deduction,
       ROUND(SUM(net_salary), 2) AS total_net,
       ROUND(AVG(net_salary), 2) AS average_net,
       SUM(CASE WHEN payroll_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count
     FROM vw_employee_payroll
     ${whereClause}
     GROUP BY payroll_year, payroll_month
     ORDER BY payroll_year DESC, payroll_month DESC`,
    params
  );
}

/**
 * Mandatory Correlated Subquery:
 * Finds employees whose active basic/net salary is strictly greater than
 * the average salary of employees in their same department.
 */
export async function getAboveDepartmentAverageReport() {
  return query<RowDataPacket[]>(
    `SELECT
       v.employee_id,
       v.employee_code,
       v.employee_name,
       v.department_name,
       v.designation_name,
       v.basic_salary,
       v.gross_salary,
       v.net_salary AS employee_salary,
       (
         SELECT ROUND(AVG(v2.net_salary), 2)
         FROM vw_employee_compensation v2
         WHERE v2.department_id = v.department_id
       ) AS department_avg_salary,
       ROUND(
         v.net_salary - (
           SELECT AVG(v2.net_salary)
           FROM vw_employee_compensation v2
           WHERE v2.department_id = v.department_id
         ),
         2
       ) AS variance_above_avg
     FROM vw_employee_compensation v
     WHERE v.net_salary > (
       SELECT AVG(v2.net_salary)
       FROM vw_employee_compensation v2
       WHERE v2.department_id = v.department_id
     )
     ORDER BY v.department_name ASC, v.net_salary DESC`
  );
}
