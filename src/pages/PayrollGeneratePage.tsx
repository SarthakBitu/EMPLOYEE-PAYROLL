import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, PlayCircle } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { formatCurrency, formatMonthYear, getMonthName } from '../utils/formatters.ts';
import { ErrorState, TableSkeleton } from '../components/StateViews.tsx';
import { useToast } from '../components/Toast.tsx';

interface PreviewEmployee {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name: string;
  designation_name: string;
  basic_salary: number;
  total_allowance: number;
  overtime_hours: number;
  overtime_pay: number;
  gross_salary: number;
  total_deduction: number;
  net_salary: number;
  present_days: number;
  leave_days: number;
  absent_days: number;
}

interface PreviewResponse {
  alreadyGenerated: boolean;
  existingCount: number;
  employees: PreviewEmployee[];
}

export function PayrollGeneratePage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [useStoredProcedure, setUseStoredProcedure] = useState(false);

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: PreviewResponse }>('/payroll/preview', {
        params: { month, year },
      });
      setPreview(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to preview payroll calculations.'));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post<{
        data: { generatedCount: number; method: string };
      }>('/payroll/generate', { month, year, useStoredProcedure });
      showToast(
        `Generated ${res.data.data.generatedCount} payroll records for ${formatMonthYear(month, year)} via ${res.data.data.method}.`,
        'success'
      );
      navigate('/payroll');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Payroll generation failed.'), 'error');
      await loadPreview();
    } finally {
      setGenerating(false);
    }
  };

  const totals = (preview?.employees || []).reduce(
    (acc, row) => ({
      gross: acc.gross + Number(row.gross_salary),
      deduction: acc.deduction + Number(row.total_deduction),
      net: acc.net + Number(row.net_salary),
    }),
    { gross: 0, deduction: 0, net: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Generate Monthly Payroll
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Atomic MySQL transaction executing DECIMAL calculations, trigger checks, and duplicate prevention.
          </p>
        </div>
        <Link
          to="/payroll"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          View Payroll Ledger
        </Link>
      </div>

      {/* Period & Execution Mode Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700">Payroll Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Payroll Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Database Engine Mode</label>
            <select
              value={useStoredProcedure ? 'sp' : 'tx'}
              onChange={(e) => setUseStoredProcedure(e.target.value === 'sp')}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="tx">MySQL Transaction (beginTransaction/commit)</option>
              <option value="sp">Stored Procedure (sp_generate_monthly_payroll)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || loading || (preview?.employees.length ?? 0) === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          <PlayCircle className="h-4 w-4" />
          <span>{generating ? 'Generating Payroll...' : `Run Payroll for ${formatMonthYear(month, year)}`}</span>
        </button>
      </div>

      {/* Period Status Banner */}
      {preview && (
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            preview.alreadyGenerated
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {preview.alreadyGenerated ? (
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            {preview.alreadyGenerated ? (
              <span>
                Payroll already exists for <strong>{formatMonthYear(month, year)}</strong> ({preview.existingCount} records). Submitting again will be blocked with HTTP 409 / SQLSTATE 45000 and rolled back to prevent duplicate payroll.
              </span>
            ) : (
              <span>
                Ready to generate payroll for <strong>{preview.employees.length} active employees</strong> in {formatMonthYear(month, year)}. Projected Gross: <strong className="font-mono">{formatCurrency(totals.gross)}</strong> · Net: <strong className="font-mono">{formatCurrency(totals.net)}</strong>.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Preview Table */}
      {loading ? (
        <TableSkeleton rows={7} cols={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPreview} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Present / Leave / Abs</th>
                  <th className="px-4 py-3 text-right">OT Hrs</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Allowance</th>
                  <th className="px-4 py-3 text-right">OT Pay</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deduction</th>
                  <th className="px-4 py-3 text-right">Net Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {preview?.employees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{emp.employee_name}</div>
                      <div className="font-mono text-xs text-slate-500">{emp.employee_code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{emp.department_name}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-600">
                      {emp.present_days} / {emp.leave_days} / {emp.absent_days}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {Number(emp.overtime_hours).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(emp.basic_salary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                      {formatCurrency(emp.total_allowance)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrency(emp.overtime_pay)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(emp.gross_salary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">
                      {formatCurrency(emp.total_deduction)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                      {formatCurrency(emp.net_salary)}
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
