import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { formatDate, formatNumber, getMonthName } from '../utils/formatters.ts';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';
import { useToast } from '../components/Toast.tsx';

interface EmployeeOption {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  employment_status: string;
}

interface AttendanceRecord {
  attendance_id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name: string;
  attendance_date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY' | 'HOLIDAY';
  working_hours: number;
  overtime_hours: number;
  remarks: string | null;
}

interface AttendanceStats {
  total_records: number;
  present_count: number;
  half_day_count: number;
  leave_count: number;
  absent_count: number;
  holiday_count: number;
  total_working_hours: number;
  total_overtime_hours: number;
}

type ViewMode = 'monthly' | 'daily' | 'employee';

export function AttendancePage() {
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedDate, setSelectedDate] = useState('2026-11-20');
  const [selectedMonth, setSelectedMonth] = useState(11);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [formEmpId, setFormEmpId] = useState('');
  const [formDate, setFormDate] = useState('2026-11-20');
  const [formStatus, setFormStatus] = useState<AttendanceRecord['status']>('PRESENT');
  const [formWorkingHrs, setFormWorkingHrs] = useState('8');
  const [formOvertimeHrs, setFormOvertimeHrs] = useState('0');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEmployees = useCallback(async () => {
    const res = await api.get<{ data: EmployeeOption[] }>('/employees', {
      params: { status: 'ACTIVE' },
    });
    setEmployees(res.data.data);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (viewMode === 'daily') {
        params.date = selectedDate;
      } else if (viewMode === 'monthly') {
        params.month = selectedMonth;
        params.year = selectedYear;
      } else if (viewMode === 'employee') {
        if (selectedEmployeeId) params.employee_id = selectedEmployeeId;
        params.month = selectedMonth;
        params.year = selectedYear;
      }
      if (statusFilter) params.status = statusFilter;

      const [listRes, statsRes] = await Promise.all([
        api.get<{ data: AttendanceRecord[] }>('/attendance', { params }),
        api.get<{ data: AttendanceStats }>('/attendance/stats', {
          params: { month: selectedMonth, year: selectedYear },
        }),
      ]);
      setRecords(listRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load attendance records.'));
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedDate, selectedMonth, selectedYear, selectedEmployeeId, statusFilter]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setFormEmpId(employees[0] ? String(employees[0].employee_id) : '');
    setFormDate(selectedDate);
    setFormStatus('PRESENT');
    setFormWorkingHrs('8');
    setFormOvertimeHrs('0');
    setFormRemarks('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (rec: AttendanceRecord) => {
    setEditing(rec);
    setFormEmpId(String(rec.employee_id));
    setFormDate(String(rec.attendance_date).slice(0, 10));
    setFormStatus(rec.status);
    setFormWorkingHrs(String(rec.working_hours));
    setFormOvertimeHrs(String(rec.overtime_hours));
    setFormRemarks(rec.remarks || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleStatusChange = (val: AttendanceRecord['status']) => {
    setFormStatus(val);
    if (val === 'PRESENT') setFormWorkingHrs('8');
    else if (val === 'HALF_DAY') setFormWorkingHrs('4');
    else {
      setFormWorkingHrs('0');
      setFormOvertimeHrs('0');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const wh = Number(formWorkingHrs);
    const ot = Number(formOvertimeHrs);
    if (!editing && !formEmpId) {
      setFormError('Please select an employee.');
      return;
    }
    if (!formDate) {
      setFormError('Attendance date is required.');
      return;
    }
    if (!Number.isFinite(wh) || wh < 0 || wh > 24) {
      setFormError('Working hours must be between 0 and 24.');
      return;
    }
    if (!Number.isFinite(ot) || ot < 0 || ot > 16) {
      setFormError('Overtime hours must be between 0 and 16.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.put(`/attendance/${editing.attendance_id}`, {
          status: formStatus,
          working_hours: wh,
          overtime_hours: ot,
          remarks: formRemarks.trim() || null,
        });
        showToast('Attendance updated.', 'success');
      } else {
        await api.post('/attendance', {
          employee_id: Number(formEmpId),
          attendance_date: formDate,
          status: formStatus,
          working_hours: wh,
          overtime_hours: ot,
          remarks: formRemarks.trim() || null,
        });
        showToast('Attendance logged.', 'success');
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Failed to save attendance.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/attendance/${deleteTarget.attendance_id}`);
      showToast('Attendance entry deleted.', 'success');
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete record.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'PRESENT') return 'text-emerald-700';
    if (status === 'HALF_DAY') return 'text-blue-700';
    if (status === 'LEAVE') return 'text-amber-700';
    if (status === 'ABSENT') return 'text-red-700';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track daily shifts, leaves, absences, and overtime hours fed directly into payroll calculations.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Mark Attendance</span>
        </button>
      </div>

      {/* Attendance Statistics Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Logged Days ({getMonthName(selectedMonth)})</div>
            <div className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {stats.total_records}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Present</div>
            <div className="mt-1 font-mono text-xl font-semibold text-emerald-700 tabular-nums">
              {stats.present_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Half Day</div>
            <div className="mt-1 font-mono text-xl font-semibold text-blue-700 tabular-nums">
              {stats.half_day_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Leave</div>
            <div className="mt-1 font-mono text-xl font-semibold text-amber-700 tabular-nums">
              {stats.leave_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Absent</div>
            <div className="mt-1 font-mono text-xl font-semibold text-red-700 tabular-nums">
              {stats.absent_count}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Overtime Hours</div>
            <div className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {formatNumber(stats.total_overtime_hours, 1)}h
            </div>
          </div>
        </div>
      )}

      {/* Mode Tabs & Filter Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { key: 'monthly', label: 'Monthly View' },
              { key: 'daily', label: 'Daily View' },
              { key: 'employee', label: 'Employee History' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setViewMode(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'daily' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          )}

          {viewMode !== 'daily' && (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {Array.from({ length: 12 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {getMonthName(idx + 1)}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono"
              >
                {[2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </>
          )}

          {viewMode === 'employee' && (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_code} · {emp.first_name} {emp.last_name || ''}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">PRESENT</option>
            <option value="HALF_DAY">HALF_DAY</option>
            <option value="LEAVE">LEAVE</option>
            <option value="ABSENT">ABSENT</option>
            <option value="HOLIDAY">HOLIDAY</option>
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      {loading ? (
        <TableSkeleton rows={7} cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No attendance entries found"
          description="Select a different date/month filter or log a new attendance entry."
          actionLabel="Mark Attendance"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Working Hrs</th>
                  <th className="px-4 py-3 text-right">Overtime Hrs</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map((rec) => (
                  <tr key={rec.attendance_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {formatDate(rec.attendance_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500 mr-2">
                        {rec.employee_code}
                      </span>
                      <span className="font-medium text-slate-900">{rec.employee_name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{rec.department_name}</td>
                    <td className={`px-4 py-3 text-xs font-semibold ${statusColor(rec.status)}`}>
                      {rec.status}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatNumber(rec.working_hours, 2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {formatNumber(rec.overtime_hours, 2)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {rec.remarks || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(rec)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Form Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Update Attendance Entry' : 'Mark Attendance'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          {!editing && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700">Employee *</label>
                <select
                  value={formEmpId}
                  onChange={(e) => setFormEmpId(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_code} · {emp.first_name} {emp.last_name || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Date *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Status *</label>
            <select
              value={formStatus}
              onChange={(e) => handleStatusChange(e.target.value as AttendanceRecord['status'])}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="PRESENT">PRESENT</option>
              <option value="HALF_DAY">HALF_DAY</option>
              <option value="LEAVE">LEAVE</option>
              <option value="ABSENT">ABSENT</option>
              <option value="HOLIDAY">HOLIDAY</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Working Hours *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formWorkingHrs}
                onChange={(e) => setFormWorkingHrs(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Overtime Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="16"
                value={formOvertimeHrs}
                onChange={(e) => setFormOvertimeHrs(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Remarks</label>
            <input
              type="text"
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Optional notes"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Attendance Record"
        message={
          deleteTarget
            ? `Remove attendance record for ${deleteTarget.employee_name} on ${formatDate(deleteTarget.attendance_date)}?`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
