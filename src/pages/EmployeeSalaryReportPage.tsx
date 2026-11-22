import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { exportToCsv, formatCurrency, getMonthName } from '../utils/formatters.ts';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';

interface Department {
  department_id: number;
  department_name: string;
}

interface EmpSalaryRow {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name: string;
  designation_name: string;
  basic_salary: number;
  total_allowance: number;
  overtime_pay?: number;
  gross_salary: number;
  total_deduction: number;
  net_salary: number;
  payroll_status?: string;
}

export function EmployeeSalaryReportPage() {
  const [rows, setRows] = useState<EmpSalaryRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [month, setMonth] = useState('10');
  const [year, setYear] = useState('2026');
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.get<{ data: Department[] }>('/departments').then((r) => setDepartments(r.data.data));
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (month && year) {
        params.month = month;
        params.year = year;
      }
      if (departmentId) params.department_id = departmentId;
      const res = await api.get<{ data: EmpSalaryRow[] }>('/reports/employee-salary', { params });
      setRows(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load employee salary report.'));
    } finally {
      setLoading(false);
    }
  }, [month, year, departmentId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = () => {
    exportToCsv(
      `employee_salary_report_${year || 'active'}_${month || 'all'}.csv`,
      ['Code', 'Employee', 'Department', 'Designation', 'Basic', 'Allowance', 'Gross', 'Deduction', 'Net'],
      rows.map((r) => [
        r.employee_code,
        r.employee_name,
        r.department_name,
        r.designation_name,
        r.basic_salary,
        r.total_allowance,
        r.gross_salary,
        r.total_deduction,
        r.net_salary,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Salary Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            Queried directly from SQL views <span className="font-mono text-xs">vw_employee_payroll</span> and <span className="font-mono text-xs">vw_employee_compensation</span>.
          </p>
        </div>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Active Salary Baseline</option>
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {getMonthName(i + 1)} Payroll
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={!month}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono disabled:opacity-50"
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.department_id} value={d.department_id}>
              {d.department_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No salary records found"
          description="Choose a generated payroll period or switch to Active Salary Baseline."
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Allowance</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deduction</th>
                  <th className="px-4 py-3 text-right">Net Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((row) => (
                  <tr key={row.employee_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.employee_name}</div>
                      <div className="font-mono text-xs text-slate-500">{row.employee_code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.department_name}</td>
                    <td className="px-4 py-3 text-slate-700">{row.designation_name}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(row.basic_salary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                      {formatCurrency(row.total_allowance)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(row.gross_salary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">
                      {formatCurrency(row.total_deduction)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                      {formatCurrency(row.net_salary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
