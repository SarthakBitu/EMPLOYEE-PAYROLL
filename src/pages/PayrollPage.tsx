import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, Eye, PlayCircle, Printer, Search } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { formatCurrency, formatMonthYear, getMonthName } from '../utils/formatters.ts';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';
import { useToast } from '../components/Toast.tsx';

interface Department {
  department_id: number;
  department_name: string;
}

interface PayrollRow {
  payroll_id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  employee_email: string;
  department_name: string;
  designation_name: string;
  payroll_month: number;
  payroll_year: number;
  basic_salary: number;
  total_allowance: number;
  overtime_pay: number;
  gross_salary: number;
  total_deduction: number;
  net_salary: number;
  working_days: number;
  present_days: number;
  leave_days: number;
  absent_days: number;
  overtime_hours: number;
  payroll_status: 'DRAFT' | 'GENERATED' | 'PAID';
  generated_at: string;
}

interface DetailedPayslip extends PayrollRow {
  allowances: Array<{ allowance_name: string; allowance_type: string; amount: number }>;
  deductions: Array<{ deduction_name: string; deduction_type: string; amount: number }>;
}

export function PayrollPage() {
  const { showToast } = useToast();

  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('2026');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [payslip, setPayslip] = useState<DetailedPayslip | null>(null);
  const [payTarget, setPayTarget] = useState<PayrollRow | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  const loadDepartments = useCallback(async () => {
    const res = await api.get<{ data: Department[] }>('/departments');
    setDepartments(res.data.data);
  }, []);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (monthFilter) params.month = monthFilter;
      if (yearFilter) params.year = yearFilter;
      if (departmentFilter) params.department_id = departmentFilter;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get<{ data: PayrollRow[] }>('/payroll', { params });
      setRows(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load payroll ledger.'));
    } finally {
      setLoading(false);
    }
  }, [monthFilter, yearFilter, departmentFilter, statusFilter, search]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPayroll();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadPayroll]);

  const openPayslip = async (row: PayrollRow) => {
    try {
      const res = await api.get<{ data: DetailedPayslip }>(`/payroll/${row.payroll_id}`);
      setPayslip(res.data.data);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load payslip details.'), 'error');
    }
  };

  const downloadPayslip = async (row: PayrollRow) => {
    try {
      const res = await api.get<{ data: DetailedPayslip }>(`/payroll/${row.payroll_id}`);
      const p = res.data.data;
      const lines = [
        'EMPLOYEE PAYROLL MANAGEMENT SYSTEM - OFFICIAL PAYSLIP',
        '======================================================',
        `Period         : ${formatMonthYear(p.payroll_month, p.payroll_year)}`,
        `Employee       : ${p.employee_name} (${p.employee_code})`,
        `Department     : ${p.department_name}`,
        `Designation    : ${p.designation_name}`,
        `Status         : ${p.payroll_status}`,
        '',
        'ATTENDANCE SUMMARY',
        `Working Days: ${p.working_days} | Present: ${p.present_days} | Leave: ${p.leave_days} | Absent: ${p.absent_days} | OT Hrs: ${p.overtime_hours}`,
        '',
        'EARNINGS',
        `  Basic Salary        : ${formatCurrency(p.basic_salary)}`,
        ...p.allowances.map((a) => `  ${a.allowance_name.padEnd(20)}: ${formatCurrency(a.amount)}`),
        `  Overtime Pay        : ${formatCurrency(p.overtime_pay)}`,
        `  GROSS SALARY        : ${formatCurrency(p.gross_salary)}`,
        '',
        'DEDUCTIONS',
        ...p.deductions.map((d) => `  ${d.deduction_name.padEnd(20)}: ${formatCurrency(d.amount)}`),
        `  TOTAL DEDUCTION     : ${formatCurrency(p.total_deduction)}`,
        '',
        `NET SALARY PAYABLE    : ${formatCurrency(p.net_salary)}`,
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${p.employee_code}_${p.payroll_year}_${String(p.payroll_month).padStart(2, '0')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Payslip downloaded.', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to download payslip.'), 'error');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!payTarget) return;
    setMarkingPaid(true);
    try {
      await api.patch(`/payroll/${payTarget.payroll_id}/pay`);
      showToast(`Payroll for ${payTarget.employee_name} marked as PAID.`, 'success');
      setPayTarget(null);
      await loadPayroll();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update payroll status.'), 'error');
    } finally {
      setMarkingPaid(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'PAID') return 'text-emerald-700';
    if (status === 'GENERATED') return 'text-blue-700';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll Ledger</h1>
          <p className="mt-1 text-sm text-slate-500">
            Queried from SQL view <span className="font-mono text-xs">vw_employee_payroll</span>. View, print, download, or disburse salaries.
          </p>
        </div>
        <Link
          to="/payroll/generate"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <PlayCircle className="h-4 w-4" />
          <span>Generate Monthly Payroll</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {getMonthName(i + 1)}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
        >
          <option value="">All Years</option>
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.department_id} value={d.department_id}>
              {d.department_name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="GENERATED">GENERATED</option>
          <option value="PAID">PAID</option>
          <option value="DRAFT">DRAFT</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPayroll} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No payroll records match your filters"
          description="Adjust the month/year filters or run monthly payroll generation."
        />
      ) : (
        <div className="no-print rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Allowance</th>
                  <th className="px-4 py-3 text-right">Overtime</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deduction</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((row) => (
                  <tr key={row.payroll_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.employee_name}</div>
                      <div className="font-mono text-xs text-slate-500">{row.employee_code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.department_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {String(row.payroll_month).padStart(2, '0')}/{row.payroll_year}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(row.basic_salary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                      {formatCurrency(row.total_allowance)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrency(row.overtime_pay)}
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
                    <td className={`px-4 py-3 text-xs font-semibold ${statusColor(row.payroll_status)}`}>
                      {row.payroll_status}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openPayslip(row)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="View & Print Payslip"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadPayslip(row)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                          title="Download Payslip"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        {row.payroll_status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => setPayTarget(row)}
                            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      <Modal
        open={Boolean(payslip)}
        onClose={() => setPayslip(null)}
        title={payslip ? `Payslip · ${formatMonthYear(payslip.payroll_month, payslip.payroll_year)}` : 'Payslip'}
        subtitle={
          payslip
            ? `${payslip.employee_code} · ${payslip.employee_name} · ${payslip.department_name}`
            : undefined
        }
        maxWidthClass="max-w-2xl"
      >
        {payslip && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
              <div>
                <span className="text-slate-500 block">Working Days</span>
                <span className="font-mono font-semibold text-slate-900 text-sm">
                  {payslip.working_days}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Present Days</span>
                <span className="font-mono font-semibold text-emerald-700 text-sm">
                  {payslip.present_days}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Leave / Absent</span>
                <span className="font-mono font-semibold text-slate-900 text-sm">
                  {payslip.leave_days} / {payslip.absent_days}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Overtime Hours</span>
                <span className="font-mono font-semibold text-slate-900 text-sm">
                  {payslip.overtime_hours}h
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
                  Earnings
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Basic Salary</dt>
                    <dd className="font-mono tabular-nums text-slate-900">
                      {formatCurrency(payslip.basic_salary)}
                    </dd>
                  </div>
                  {payslip.allowances.map((a, idx) => (
                    <div key={idx} className="flex justify-between">
                      <dt className="text-slate-600">{a.allowance_name}</dt>
                      <dd className="font-mono tabular-nums text-emerald-700">
                        {formatCurrency(a.amount)}
                      </dd>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Overtime Pay</dt>
                    <dd className="font-mono tabular-nums text-slate-900">
                      {formatCurrency(payslip.overtime_pay)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <dt className="text-slate-900">Gross Salary</dt>
                    <dd className="font-mono tabular-nums text-slate-900">
                      {formatCurrency(payslip.gross_salary)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
                  Deductions
                </h3>
                <dl className="space-y-2 text-sm">
                  {payslip.deductions.map((d, idx) => (
                    <div key={idx} className="flex justify-between">
                      <dt className="text-slate-600">{d.deduction_name}</dt>
                      <dd className="font-mono tabular-nums text-amber-700">
                        {formatCurrency(d.amount)}
                      </dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <dt className="text-slate-900">Total Deduction</dt>
                    <dd className="font-mono tabular-nums text-amber-700">
                      {formatCurrency(payslip.total_deduction)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-900 px-5 py-4 text-white">
              <div>
                <div className="text-xs text-slate-300">Net Salary Payable</div>
                <div className="text-xs text-slate-400">Status: {payslip.payroll_status}</div>
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums">
                {formatCurrency(payslip.net_salary)}
              </div>
            </div>

            <div className="no-print flex justify-end gap-3">
              <button
                type="button"
                onClick={() => downloadPayslip(payslip)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                <Printer className="h-4 w-4" />
                <span>Print Payslip</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        onConfirm={handleMarkAsPaid}
        title="Confirm Salary Disbursement"
        message={
          payTarget
            ? `Mark ${formatCurrency(payTarget.net_salary)} net salary for ${payTarget.employee_name} (${formatMonthYear(payTarget.payroll_month, payTarget.payroll_year)}) as PAID? Once marked PAID, database trigger before_payroll_update locks monetary amounts.`
            : ''
        }
        confirmLabel="Mark as Paid"
        loading={markingPaid}
      />
    </div>
  );
}
