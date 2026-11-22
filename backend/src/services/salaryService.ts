import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getConnection, query } from '../config/db.ts';
import { AppError } from '../utils/appError.ts';

export interface SalaryComponentInput {
  id: number;
  amount: number;
}

export interface SalaryStructurePayload {
  employee_id: number;
  basic_salary: number;
  effective_from: string;
  effective_to: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  allowances: SalaryComponentInput[];
  deductions: SalaryComponentInput[];
}

export async function listAllSalaryStructures() {
  const structures = await query<RowDataPacket[]>(
    `SELECT
       ss.*,
       e.employee_code,
       TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
       e.employment_status,
       d.department_name,
       des.designation_name,
       COALESCE(al.total_allowance, 0.00) AS total_allowance,
       COALESCE(ded.total_deduction, 0.00) AS total_deduction,
       ROUND(ss.basic_salary + COALESCE(al.total_allowance, 0.00), 2) AS gross_salary,
       ROUND((ss.basic_salary + COALESCE(al.total_allowance, 0.00)) - COALESCE(ded.total_deduction, 0.00), 2) AS net_salary
     FROM SALARY_STRUCTURE ss
     INNER JOIN EMPLOYEE e ON ss.employee_id = e.employee_id
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
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
     ORDER BY ss.status ASC, e.employee_code ASC, ss.effective_from DESC`
  );
  return structures;
}

export async function getSalaryByEmployeeId(employeeId: number) {
  const structures = await query<RowDataPacket[]>(
    `SELECT
       ss.*,
       e.employee_code,
       TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
       d.department_name,
       des.designation_name
     FROM SALARY_STRUCTURE ss
     INNER JOIN EMPLOYEE e ON ss.employee_id = e.employee_id
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
     WHERE ss.employee_id = ?
     ORDER BY ss.status ASC, ss.effective_from DESC`,
    [employeeId]
  );

  const enriched = await Promise.all(
    structures.map(async (s) => {
      const allowances = await query<RowDataPacket[]>(
        `SELECT sa.salary_allowance_id, sa.allowance_id, sa.amount, a.allowance_name, a.allowance_type
         FROM SALARY_ALLOWANCE sa
         INNER JOIN ALLOWANCE a ON sa.allowance_id = a.allowance_id
         WHERE sa.salary_structure_id = ?
         ORDER BY a.allowance_name ASC`,
        [s.salary_structure_id]
      );
      const deductions = await query<RowDataPacket[]>(
        `SELECT sd.salary_deduction_id, sd.deduction_id, sd.amount, ded.deduction_name, ded.deduction_type
         FROM SALARY_DEDUCTION sd
         INNER JOIN DEDUCTION ded ON sd.deduction_id = ded.deduction_id
         WHERE sd.salary_structure_id = ?
         ORDER BY ded.deduction_name ASC`,
        [s.salary_structure_id]
      );
      const totals = await query<RowDataPacket[]>(
        `SELECT
           ROUND(?, 2) AS basic_salary,
           COALESCE((SELECT ROUND(SUM(amount), 2) FROM SALARY_ALLOWANCE WHERE salary_structure_id = ?), 0.00) AS total_allowance,
           COALESCE((SELECT ROUND(SUM(amount), 2) FROM SALARY_DEDUCTION WHERE salary_structure_id = ?), 0.00) AS total_deduction`,
        [s.basic_salary, s.salary_structure_id, s.salary_structure_id]
      );
      const t = totals[0];
      const grossSalary = Number((Number(t.basic_salary) + Number(t.total_allowance)).toFixed(2));
      const netSalary = Number((grossSalary - Number(t.total_deduction)).toFixed(2));

      return {
        ...s,
        allowances,
        deductions,
        total_allowance: Number(t.total_allowance),
        total_deduction: Number(t.total_deduction),
        gross_salary: grossSalary,
        net_salary: netSalary,
      };
    })
  );

  return enriched;
}

export async function getSalaryStructureById(id: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT ss.*, e.employee_code, TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name
     FROM SALARY_STRUCTURE ss
     INNER JOIN EMPLOYEE e ON ss.employee_id = e.employee_id
     WHERE ss.salary_structure_id = ?`,
    [id]
  );
  if (rows.length === 0) {
    throw new AppError('Salary structure not found.', 404);
  }
  const allowances = await query<RowDataPacket[]>(
    `SELECT sa.*, a.allowance_name, a.allowance_type
     FROM SALARY_ALLOWANCE sa
     INNER JOIN ALLOWANCE a ON sa.allowance_id = a.allowance_id
     WHERE sa.salary_structure_id = ?`,
    [id]
  );
  const deductions = await query<RowDataPacket[]>(
    `SELECT sd.*, d.deduction_name, d.deduction_type
     FROM SALARY_DEDUCTION sd
     INNER JOIN DEDUCTION d ON sd.deduction_id = d.deduction_id
     WHERE sd.salary_structure_id = ?`,
    [id]
  );
  return { ...rows[0], allowances, deductions };
}

export async function createSalaryStructure(data: SalaryStructurePayload) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    if (data.status === 'ACTIVE') {
      await conn.execute(
        "UPDATE SALARY_STRUCTURE SET status = 'INACTIVE', effective_to = COALESCE(effective_to, ?) WHERE employee_id = ? AND status = 'ACTIVE'",
        [data.effective_from, data.employee_id]
      );
    }

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO SALARY_STRUCTURE (employee_id, basic_salary, effective_from, effective_to, status)
       VALUES (?, ?, ?, ?, ?)`,
      [data.employee_id, data.basic_salary, data.effective_from, data.effective_to, data.status]
    );

    const salaryStructureId = result.insertId;

    for (const item of data.allowances) {
      await conn.execute(
        'INSERT INTO SALARY_ALLOWANCE (salary_structure_id, allowance_id, amount) VALUES (?, ?, ?)',
        [salaryStructureId, item.id, item.amount]
      );
    }

    for (const item of data.deductions) {
      await conn.execute(
        'INSERT INTO SALARY_DEDUCTION (salary_structure_id, deduction_id, amount) VALUES (?, ?, ?)',
        [salaryStructureId, item.id, item.amount]
      );
    }

    await conn.commit();
    return getSalaryStructureById(salaryStructureId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateSalaryStructure(id: number, data: SalaryStructurePayload) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.execute<RowDataPacket[]>(
      'SELECT employee_id FROM SALARY_STRUCTURE WHERE salary_structure_id = ? FOR UPDATE',
      [id]
    );
    if (existingRows.length === 0) {
      await conn.rollback();
      throw new AppError('Salary structure not found.', 404);
    }

    if (data.status === 'ACTIVE') {
      await conn.execute(
        "UPDATE SALARY_STRUCTURE SET status = 'INACTIVE' WHERE employee_id = ? AND salary_structure_id <> ? AND status = 'ACTIVE'",
        [data.employee_id, id]
      );
    }

    await conn.execute(
      `UPDATE SALARY_STRUCTURE
       SET employee_id = ?, basic_salary = ?, effective_from = ?, effective_to = ?, status = ?
       WHERE salary_structure_id = ?`,
      [data.employee_id, data.basic_salary, data.effective_from, data.effective_to, data.status, id]
    );

    await conn.execute('DELETE FROM SALARY_ALLOWANCE WHERE salary_structure_id = ?', [id]);
    for (const item of data.allowances) {
      await conn.execute(
        'INSERT INTO SALARY_ALLOWANCE (salary_structure_id, allowance_id, amount) VALUES (?, ?, ?)',
        [id, item.id, item.amount]
      );
    }

    await conn.execute('DELETE FROM SALARY_DEDUCTION WHERE salary_structure_id = ?', [id]);
    for (const item of data.deductions) {
      await conn.execute(
        'INSERT INTO SALARY_DEDUCTION (salary_structure_id, deduction_id, amount) VALUES (?, ?, ?)',
        [id, item.id, item.amount]
      );
    }

    await conn.commit();
    return getSalaryStructureById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
