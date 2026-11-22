import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getConnection, getPool, query } from '../config/db.ts';
import { AppError } from '../utils/appError.ts';

export interface PayrollFilters {
  month?: number;
  year?: number;
  department_id?: number;
  status?: string;
  search?: string;
}

export async function listPayroll(filters: PayrollFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.month) {
    conditions.push('payroll_month = ?');
    params.push(filters.month);
  }
  if (filters.year) {
    conditions.push('payroll_year = ?');
    params.push(filters.year);
  }
  if (filters.department_id) {
    conditions.push('department_id = ?');
    params.push(filters.department_id);
  }
  if (filters.status && ['DRAFT', 'GENERATED', 'PAID'].includes(filters.status)) {
    conditions.push('payroll_status = ?');
    params.push(filters.status);
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push('(employee_code LIKE ? OR employee_name LIKE ? OR department_name LIKE ?)');
    params.push(term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return query<RowDataPacket[]>(
    `SELECT * FROM vw_employee_payroll
     ${whereClause}
     ORDER BY payroll_year DESC, payroll_month DESC, employee_code ASC`,
    params
  );
}

export async function getPayrollById(payrollId: number) {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM vw_employee_payroll WHERE payroll_id = ?',
    [payrollId]
  );
  if (rows.length === 0) {
    throw new AppError('Payroll record not found.', 404);
  }
  const payroll = rows[0];

  // Fetch itemized allowances and deductions from the employee's active/applicable salary structure
  const allowances = await query<RowDataPacket[]>(
    `SELECT a.allowance_name, a.allowance_type, sa.amount
     FROM SALARY_STRUCTURE ss
     INNER JOIN SALARY_ALLOWANCE sa ON ss.salary_structure_id = sa.salary_structure_id
     INNER JOIN ALLOWANCE a ON sa.allowance_id = a.allowance_id
     WHERE ss.employee_id = ? AND ss.status = 'ACTIVE'
     ORDER BY a.allowance_name ASC`,
    [payroll.employee_id]
  );

  const deductions = await query<RowDataPacket[]>(
    `SELECT d.deduction_name, d.deduction_type, sd.amount
     FROM SALARY_STRUCTURE ss
     INNER JOIN SALARY_DEDUCTION sd ON ss.salary_structure_id = sd.salary_structure_id
     INNER JOIN DEDUCTION d ON sd.deduction_id = d.deduction_id
     WHERE ss.employee_id = ? AND ss.status = 'ACTIVE'
     ORDER BY d.deduction_name ASC`,
    [payroll.employee_id]
  );

  return {
    ...payroll,
    allowances,
    deductions,
  };
}

export async function getMonthlyPayroll(year: number, month: number) {
  return query<RowDataPacket[]>(
    `SELECT * FROM vw_employee_payroll
     WHERE payroll_year = ? AND payroll_month = ?
     ORDER BY department_name ASC, employee_code ASC`,
    [year, month]
  );
}

export async function previewMonthlyPayroll(month: number, year: number) {
  const [existing] = await query<RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM PAYROLL WHERE payroll_month = ? AND payroll_year = ?',
    [month, year]
  );

  const previewRows = await query<RowDataPacket[]>(
    `SELECT
       e.employee_id,
       e.employee_code,
       TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
       d.department_name,
       des.designation_name,
       ss.basic_salary,
       COALESCE(al.total_allowance, 0.00) AS total_allowance,
       COALESCE(att.overtime_hours, 0.00) AS overtime_hours,
       ROUND(COALESCE(att.overtime_hours, 0.00) * ROUND((ss.basic_salary / 160.00) * 1.50, 2), 2) AS overtime_pay,
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
       COALESCE(att.absent_days, 0) AS absent_days
     FROM EMPLOYEE e
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
     INNER JOIN SALARY_STRUCTURE ss ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
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
       WHERE MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
       GROUP BY employee_id
     ) att ON e.employee_id = att.employee_id
     WHERE e.employment_status = 'ACTIVE'
     ORDER BY e.employee_code ASC`,
    [month, year]
  );

  return {
    alreadyGenerated: Number(existing?.cnt || 0) > 0,
    existingCount: Number(existing?.cnt || 0),
    employees: previewRows,
  };
}

/**
 * Generates monthly payroll inside a strict MySQL ACID transaction.
 * Supports either direct transactional SQL execution (beginTransaction/commit/rollback)
 * or invoking the database stored procedure sp_generate_monthly_payroll.
 */
export async function generateMonthlyPayroll(
  month: number,
  year: number,
  useStoredProcedure = false
) {
  if (useStoredProcedure) {
    const conn = await getConnection();
    try {
      await conn.query('SET @p_generated_count = 0');
      await conn.query('CALL sp_generate_monthly_payroll(?, ?, @p_generated_count)', [month, year]);
      const [outRows] = await conn.query<RowDataPacket[]>(
        'SELECT @p_generated_count AS generated_count'
      );
      const generatedCount = Number(outRows[0]?.generated_count || 0);
      const records = await getMonthlyPayroll(year, month);
      return {
        month,
        year,
        generatedCount,
        method: 'STORED_PROCEDURE',
        records,
      };
    } finally {
      conn.release();
    }
  }

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    // 1. Check whether payroll already exists for this period (locking rows to prevent race duplicates)
    const [existingRows] = await conn.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM PAYROLL WHERE payroll_month = ? AND payroll_year = ? FOR UPDATE',
      [month, year]
    );
    if (Number(existingRows[0]?.cnt || 0) > 0) {
      await conn.rollback();
      throw new AppError(
        `Payroll has already been generated for ${String(month).padStart(2, '0')}/${year}. Duplicate payroll is not allowed.`,
        409
      );
    }

    // 2. Verify active employees with active salary structures exist
    const [activeRows] = await conn.execute<RowDataPacket[]>(
      `SELECT e.employee_id
       FROM EMPLOYEE e
       INNER JOIN SALARY_STRUCTURE ss
         ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
       WHERE e.employment_status = 'ACTIVE'`
    );
    if (activeRows.length === 0) {
      await conn.rollback();
      throw new AppError(
        'No active employees with an active salary structure were found for payroll generation.',
        400
      );
    }

    // 3. Insert payroll records calculated strictly with MySQL DECIMAL precision
    // Trigger `before_payroll_insert` validates every row automatically.
    const [insertResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO PAYROLL (
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
         ?,
         ?,
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
         WHERE MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
         GROUP BY employee_id
       ) att ON e.employee_id = att.employee_id
       WHERE e.employment_status = 'ACTIVE'`,
      [month, year, month, year]
    );

    await conn.commit();

    const records = await getMonthlyPayroll(year, month);
    return {
      month,
      year,
      generatedCount: insertResult.affectedRows,
      method: 'TRANSACTION',
      records,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function markPayrollAsPaid(payrollId: number) {
  const [result] = await getPool().execute<ResultSetHeader>(
    "UPDATE PAYROLL SET payroll_status = 'PAID' WHERE payroll_id = ?",
    [payrollId]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Payroll record not found.', 404);
  }
  return getPayrollById(payrollId);
}
