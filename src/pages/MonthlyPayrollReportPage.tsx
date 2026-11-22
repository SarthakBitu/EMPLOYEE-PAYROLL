import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { exportToCsv, formatCurrency, formatMonthYear } from '../utils/formatters.ts';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';

interface MonthlyPayrollRow {
  payroll_year: number;
  payroll_month: number;
  employee_count: number;
  total_basic: number;
  total_allowance: number;
  total_overtime: number;
  total_gross: number;
  total_deduction: number;
  total_net: number;
  average_net: number;
  paid_count: number;
}

export function MonthlyPayrollReportPage() {
  const [rows, setRows] = useState<MonthlyPayrollRow[]>([]);
  const [year, setYear] = useState('2026');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (year) params.year = year;
      const res = await api.get<{ data: MonthlyPayrollRow[] }>('/reports/monthly-payroll', { params });
      setRows(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load monthly payroll report.'));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = () => {
    exportToCsv(
      `monthly_payroll_report_${year || 'all'}.csv`,
      ['Period', 'Employees', 'Basic', 'Allowances', 'Overtime', 'Gross', 'Deductions', 'Net', 'Average Net', 'Paid Count'],
      rows.map((r) => [
        formatMonthYear(r.payroll_month, r.payroll_year),
        r.employee_count,
        r.total_basic,
        r.total_allowance,
        r.total_overtime,
        r.total_gross,
        r.total_deduction,
        r.total_net,
        r.average_net,
        r.paid_count,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Payroll Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            Period-level payroll rollups aggregated directly from <span className="font-mono text-xs">vw_employee_payroll</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
          >
            <option value="">All Years</option>
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
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
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No payroll cycles found for this year"
          description="Generate monthly payroll to see period summaries here."
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Employees</th>
                  <th className="px-4 py-3 text-right">Total Basic</th>
                  <th className="px-4 py-3 text-right">Total Allowance</th>
                  <th className="px-4 py-3 text-right">Total Overtime</th>
                  <th className="px-4 py-3 text-right">Total Gross</th>
                  <th className="px-4 py-3 text-right">Total Deduction</th>
                  <th className="px-4 py-3 text-right">Total Net</th>
                  <th className="px-4 py-3 text-right">Paid Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((row) => (
                  <tr key={`${row.payroll_year}-${row.payroll_month}`} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMonthYear(row.payroll_month, row.payroll_year)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {row.employee_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(row.total_basic)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                      {formatCurrency(row.total_allowance)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrency(row.total_overtime)}
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
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700">
                      {row.paid_count} / {row.employee_count} PAID
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
