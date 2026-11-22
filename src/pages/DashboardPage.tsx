import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { formatCurrency, formatMonthYear } from '../utils/formatters.ts';
import { ErrorState } from '../components/StateViews.tsx';

interface DashboardData {
  kpis: {
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    totalDesignations: number;
    currentMonthGross: number;
    currentMonthDeduction: number;
    currentMonthNet: number;
    payrollPeriod: { month: number; year: number };
    attendancePeriod: { month: number; year: number };
  };
  charts: {
    employeesByDepartment: Array<{
      department: string;
      total_employees: number;
      active_employees: number;
    }>;
    salaryByDepartment: Array<{
      department: string;
      total_gross: number;
      total_net: number;
      avg_net: number;
    }>;
    monthlyPayrollTrend: Array<{
      period: string;
      total_gross: number;
      total_deduction: number;
      total_net: number;
    }>;
    attendanceSummary: Array<{
      status: string;
      count: number;
    }>;
  };
}

const ATTENDANCE_COLORS: Record<string, string> = {
  PRESENT: '#16A34A',
  HALF_DAY: '#2563EB',
  LEAVE: '#D97706',
  ABSENT: '#DC2626',
  HOLIDAY: '#64748B',
};

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: DashboardData }>('/dashboard/summary');
      setData(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load dashboard metrics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white p-5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl border border-slate-200 bg-white p-5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || 'Unable to load dashboard.'} onRetry={loadSummary} />;
  }

  const { kpis, charts } = data;
  const periodLabel = formatMonthYear(kpis.payrollPeriod.month, kpis.payrollPeriod.year);
  const attPeriodLabel = formatMonthYear(kpis.attendancePeriod.month, kpis.attendancePeriod.year);

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payroll &amp; Workforce Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live SQL metrics · Latest payroll cycle: {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/payroll/generate"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Generate Payroll</span>
          </Link>
        </div>
      </div>

      {/* Workforce KPI Row (4 columns) */}
      <section aria-label="Organization metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-medium text-slate-500">Total Employees</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {kpis.totalEmployees}
          </div>
          <div className="mt-1 text-xs text-slate-500">Registered staff records</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-medium text-slate-500">Active Employees</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-emerald-700 tabular-nums">
            {kpis.activeEmployees}
          </div>
          <div className="mt-1 text-xs text-slate-500">Eligible for monthly payroll</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-medium text-slate-500">Departments</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {kpis.totalDepartments}
          </div>
          <div className="mt-1 text-xs text-slate-500">Active organizational units</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-medium text-slate-500">Designations</div>
          <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {kpis.totalDesignations}
          </div>
          <div className="mt-1 text-xs text-slate-500">Defined job roles</div>
        </div>
      </section>

      {/* Current Month Payroll KPI Row (3 columns) */}
      <section aria-label="Monthly payroll totals" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-medium text-slate-500">Current Month Gross Salary</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(kpis.currentMonthGross)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{periodLabel} · Basic + Allowances + OT</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-medium text-slate-500">Current Month Deduction</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {formatCurrency(kpis.currentMonthDeduction)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{periodLabel} · Tax, PF &amp; Insurance</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-medium text-slate-500">Current Month Net Salary</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-blue-700 tabular-nums">
            {formatCurrency(kpis.currentMonthNet)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{periodLabel} · Total net disbursement</div>
        </div>
      </section>

      {/* 4 Required Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Employees by Department */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Employees by Department</h2>
              <p className="text-xs text-slate-500">Total vs active headcount per unit</p>
            </div>
            <Link
              to="/employees"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              <span>Directory</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.employeesByDepartment} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="department" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total_employees" name="Total Employees" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="active_employees" name="Active Employees" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Salary by Department */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Salary by Department</h2>
              <p className="text-xs text-slate-500">Monthly gross vs net compensation structure</p>
            </div>
            <Link
              to="/reports/department-salary"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              <span>Report</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.salaryByDepartment} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="department" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total_gross" name="Total Gross" fill="#0F172A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total_net" name="Total Net" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Monthly Payroll Trend */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Monthly Payroll Trend</h2>
              <p className="text-xs text-slate-500">Gross, deduction, and net salary across periods</p>
            </div>
            <Link
              to="/reports/monthly-payroll"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              <span>History</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.monthlyPayrollTrend} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total_gross" name="Gross Salary" stroke="#0F172A" strokeWidth={2} />
                <Line type="monotone" dataKey="total_net" name="Net Salary" stroke="#1D4ED8" strokeWidth={2} />
                <Line type="monotone" dataKey="total_deduction" name="Deductions" stroke="#D97706" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Attendance Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Attendance Summary</h2>
              <p className="text-xs text-slate-500">Status distribution for {attPeriodLabel}</p>
            </div>
            <Link
              to="/attendance"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              <span>Attendance Log</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.attendanceSummary}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="48%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {charts.attendanceSummary.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={ATTENDANCE_COLORS[entry.status] || '#64748B'}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
