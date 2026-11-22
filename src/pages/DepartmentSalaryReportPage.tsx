import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { exportToCsv, formatCurrency, getMonthName } from '../utils/formatters.ts';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';

interface DeptSalaryRow {
  department_id: number;
  department: string;
  employee_count: number;
  total_basic: number;
  total_allowance: number;
  total_overtime: number;
  total_gross: number;
  total_deduction: number;
  total_net: number;
  average_salary: number;
}

export function DepartmentSalaryReportPage() {
  const [rows, setRows] = useState<DeptSalaryRow[]>([]);
  const [month, setMonth] = useState('10');
  const [year, setYear] = useState('2026');
  const [minEmployees, setMinEmployees] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (month && year) {
        params.month = month;
        params.year = year;
      }
      if (minEmployees) params.min_employees = minEmployees;

      const res = await api.get<{ data: DeptSalaryRow[] }>('/reports/department-salary', { params });
      setRows(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load department salary report.'));
    } finally {
      setLoading(false);
    }
  }, [month, year, minEmployees]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = () => {
    exportToCsv(
      `department_salary_report_${year || 'active'}_${month || 'all'}.csv`,
      ['Department', 'Employees', 'Total Basic', 'Total Gross', 'Total Deduction', 'Total Net', 'Average Salary'],
      rows.map((r) => [
        r.department,
        r.employee_count,
        r.total_basic,
        r.total_gross,
        r.total_deduction,
        r.total_net,
        r.average_salary,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Department Salary Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            SQL aggregate query using COUNT(), SUM(), AVG(), GROUP BY, and HAVING filters.
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
          <option value="">Active Salary Structures (Baseline)</option>
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

        <input
          type="number"
          min="1"
          value={minEmployees}
          onChange={(e) => setMinEmployees(e.target.value)}
          placeholder="HAVING min employees (e.g. 4)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No department salary data for selected filter"
          description="Try choosing a generated payroll month (e.g., October 2026) or clearing the HAVING filter."
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Employees</th>
                  <th className="px-4 py-3 text-right">Total Basic</th>
                  <th className="px-4 py-3 text-right">Total Gross</th>
                  <th className="px-4 py-3 text-right">Total Deduction</th>
                  <th className="px-4 py-3 text-right">Total Net</th>
                  <th className="px-4 py-3 text-right">Average Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((row) => (
                  <tr key={row.department_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.department}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {row.employee_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(row.total_basic)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(row.total_gross)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">
                      {formatCurrency(row.total_deduction)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                      {formatCurrency(row.total_net)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrency(row.average_salary)}
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
