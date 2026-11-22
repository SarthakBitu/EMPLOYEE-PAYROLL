import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { exportToCsv, formatCurrency } from '../utils/formatters.ts';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';

interface AboveAvgRow {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name: string;
  designation_name: string;
  basic_salary: number;
  gross_salary: number;
  employee_salary: number;
  department_avg_salary: number;
  variance_above_avg: number;
}

const REPORT_LINKS = [
  {
    to: '/reports/department-salary',
    title: 'Department Salary Report',
    description: 'Aggregate COUNT, SUM, AVG, GROUP BY, and HAVING analysis per department.',
  },
  {
    to: '/reports/employee-salary',
    title: 'Employee Salary Report',
    description: 'Detailed employee compensation queried directly from vw_employee_payroll.',
  },
  {
    to: '/reports/attendance',
    title: 'Attendance Report',
    description: 'Monthly breakdown of present days, half days, leaves, absences, and overtime.',
  },
  {
    to: '/reports/monthly-payroll',
    title: 'Monthly Payroll Report',
    description: 'Period-by-period expenditure summary with disbursement completion tracking.',
  },
];

export function ReportsHubPage() {
  const [aboveAvg, setAboveAvg] = useState<AboveAvgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAboveAverage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: AboveAvgRow[] }>('/reports/above-department-average');
      setAboveAvg(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load above-department-average report.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAboveAverage();
  }, [loadAboveAverage]);

  const handleExportCsv = () => {
    exportToCsv(
      'above_department_average_report.csv',
      ['Code', 'Employee', 'Department', 'Designation', 'Employee Net Salary', 'Department Avg Salary', 'Variance'],
      aboveAvg.map((r) => [
        r.employee_code,
        r.employee_name,
        r.department_name,
        r.designation_name,
        r.employee_salary,
        r.department_avg_salary,
        r.variance_above_avg,
      ])
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">SQL Reports &amp; Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every report below executes real parameterized SQL views, aggregate queries, and correlated subqueries against MySQL.
        </p>
      </div>

      {/* Report Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-600 transition-colors flex flex-col justify-between"
          >
            <div>
              <h2 className="text-base font-semibold text-slate-900 group-hover:text-blue-700">
                {item.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{item.description}</p>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
              <span>Open Report</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Correlated Nested Query Report */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Employees Earning Above Department Average
            </h2>
            <p className="text-sm text-slate-500">
              Correlated subquery comparing each employee&apos;s net salary against the computed average within their own department.
            </p>
          </div>
          {aboveAvg.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadAboveAverage} />
        ) : aboveAvg.length === 0 ? (
          <EmptyState
            title="No outliers above department average"
            description="All employees in each department currently share the same compensation."
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
                    <th className="px-4 py-3 text-right">Employee Salary</th>
                    <th className="px-4 py-3 text-right">Dept Average Salary</th>
                    <th className="px-4 py-3 text-right">Above Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {aboveAvg.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{row.employee_name}</div>
                        <div className="font-mono text-xs text-slate-500">{row.employee_code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.department_name}</td>
                      <td className="px-4 py-3 text-slate-700">{row.designation_name}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrency(row.employee_salary)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrency(row.department_avg_salary)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-emerald-700">
                        +{formatCurrency(row.variance_above_avg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
