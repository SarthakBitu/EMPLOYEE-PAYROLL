import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { exportToCsv, formatNumber, getMonthName } from '../utils/formatters.ts';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';

interface Department {
  department_id: number;
  department_name: string;
}

interface AttendanceReportRow {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name: string;
  designation_name: string;
  total_logged_days: number;
  present_days: number;
  half_days: number;
  leave_days: number;
  absent_days: number;
  total_working_hours: number;
  total_overtime_hours: number;
}

export function AttendanceReportPage() {
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);
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
      const params: Record<string, string | number> = { month, year };
      if (departmentId) params.department_id = departmentId;
      const res = await api.get<{ data: AttendanceReportRow[] }>('/reports/attendance', { params });
      setRows(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load attendance report.'));
    } finally {
      setLoading(false);
    }
  }, [month, year, departmentId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = () => {
    exportToCsv(
      `attendance_report_${year}_${month}.csv`,
      ['Code', 'Employee', 'Department', 'Logged Days', 'Present', 'Half Days', 'Leave', 'Absent', 'Working Hrs', 'Overtime Hrs'],
      rows.map((r) => [
        r.employee_code,
        r.employee_name,
        r.department_name,
        r.total_logged_days,
        r.present_days,
        r.half_days,
        r.leave_days,
        r.absent_days,
        r.total_working_hours,
        r.total_overtime_hours,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            Employee-level attendance aggregation using SQL LEFT JOIN and conditional SUM() counts.
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
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {getMonthName(i + 1)}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
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
        <TableSkeleton rows={8} cols={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No active employees found"
          description="No records matched the selected filters."
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Logged</th>
                  <th className="px-4 py-3 text-right">Present</th>
                  <th className="px-4 py-3 text-right">Half Day</th>
                  <th className="px-4 py-3 text-right">Leave</th>
                  <th className="px-4 py-3 text-right">Absent</th>
                  <th className="px-4 py-3 text-right">Working Hrs</th>
                  <th className="px-4 py-3 text-right">Overtime Hrs</th>
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
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {row.total_logged_days}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                      {row.present_days}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-blue-700">
                      {row.half_days}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">
                      {row.leave_days}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-red-700">
                      {row.absent_days}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatNumber(row.total_working_hours, 1)}h
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatNumber(row.total_overtime_hours, 1)}h
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
