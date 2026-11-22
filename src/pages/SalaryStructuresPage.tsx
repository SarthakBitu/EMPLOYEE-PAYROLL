import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import { Modal } from '../components/Modal.tsx';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';
import { useToast } from '../components/Toast.tsx';

interface SalarySummaryRow {
  salary_structure_id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name: string;
  designation_name: string;
  basic_salary: number;
  effective_from: string;
  effective_to: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  total_allowance: number;
  total_deduction: number;
  gross_salary: number;
  net_salary: number;
}

interface EmployeeOption {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  employment_status: string;
}

interface CatalogItem {
  allowance_id?: number;
  allowance_name?: string;
  allowance_type?: 'FIXED' | 'PERCENTAGE';
  deduction_id?: number;
  deduction_name?: string;
  deduction_type?: 'FIXED' | 'PERCENTAGE';
  default_amount: number;
}

interface AssignedLine {
  id: number;
  amount: string;
}

export function SalaryStructuresPage() {
  const { showToast } = useToast();

  const [structures, setStructures] = useState<SalarySummaryRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [allowancesCatalog, setAllowancesCatalog] = useState<CatalogItem[]>([]);
  const [deductionsCatalog, setDeductionsCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [basicSalary, setBasicSalary] = useState('5000');
  const [effectiveFrom, setEffectiveFrom] = useState('2026-11-01');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [assignedAllowances, setAssignedAllowances] = useState<AssignedLine[]>([]);
  const [assignedDeductions, setAssignedDeductions] = useState<AssignedLine[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [salRes, empRes, alRes, dedRes] = await Promise.all([
        api.get<{ data: SalarySummaryRow[] }>('/salaries'),
        api.get<{ data: EmployeeOption[] }>('/employees'),
        api.get<{ data: CatalogItem[] }>('/allowances'),
        api.get<{ data: CatalogItem[] }>('/deductions'),
      ]);
      setStructures(salRes.data.data);
      setEmployees(empRes.data.data);
      setAllowancesCatalog(alRes.data.data);
      setDeductionsCatalog(dedRes.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load salary structures.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const resolveDefaultAmount = (item: CatalogItem, basic: number): string => {
    const type = item.allowance_type || item.deduction_type;
    if (type === 'PERCENTAGE') {
      return ((basic * Number(item.default_amount)) / 100).toFixed(2);
    }
    return Number(item.default_amount).toFixed(2);
  };

  const openCreate = () => {
    const defaultBasic = 5000;
    setEditingId(null);
    setEmployeeId(employees[0] ? String(employees[0].employee_id) : '');
    setBasicSalary(String(defaultBasic));
    setEffectiveFrom('2026-11-01');
    setStatus('ACTIVE');
    setAssignedAllowances(
      allowancesCatalog.slice(0, 3).map((a) => ({
        id: a.allowance_id!,
        amount: resolveDefaultAmount(a, defaultBasic),
      }))
    );
    setAssignedDeductions(
      deductionsCatalog.slice(0, 2).map((d) => ({
        id: d.deduction_id!,
        amount: resolveDefaultAmount(d, defaultBasic),
      }))
    );
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = async (row: SalarySummaryRow) => {
    setFormError(null);
    try {
      const res = await api.get<{
        data: Array<{
          salary_structure_id: number;
          allowances: Array<{ allowance_id: number; amount: number }>;
          deductions: Array<{ deduction_id: number; amount: number }>;
        }>;
      }>(`/salaries/${row.employee_id}`);
      const match = res.data.data.find((s) => s.salary_structure_id === row.salary_structure_id);
      setEditingId(row.salary_structure_id);
      setEmployeeId(String(row.employee_id));
      setBasicSalary(String(row.basic_salary));
      setEffectiveFrom(String(row.effective_from).slice(0, 10));
      setStatus(row.status);
      setAssignedAllowances(
        (match?.allowances || []).map((a) => ({
          id: a.allowance_id,
          amount: Number(a.amount).toFixed(2),
        }))
      );
      setAssignedDeductions(
        (match?.deductions || []).map((d) => ({
          id: d.deduction_id,
          amount: Number(d.amount).toFixed(2),
        }))
      );
      setModalOpen(true);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to load salary structure details.'), 'error');
    }
  };

  const addAllowanceRow = () => {
    const used = new Set(assignedAllowances.map((a) => a.id));
    const next = allowancesCatalog.find((a) => !used.has(a.allowance_id!));
    if (!next) {
      showToast('All available allowance types are already added.', 'info');
      return;
    }
    const basic = Number(basicSalary) || 0;
    setAssignedAllowances([
      ...assignedAllowances,
      { id: next.allowance_id!, amount: resolveDefaultAmount(next, basic) },
    ]);
  };

  const addDeductionRow = () => {
    const used = new Set(assignedDeductions.map((d) => d.id));
    const next = deductionsCatalog.find((d) => !used.has(d.deduction_id!));
    if (!next) {
      showToast('All available deduction types are already added.', 'info');
      return;
    }
    const basic = Number(basicSalary) || 0;
    setAssignedDeductions([
      ...assignedDeductions,
      { id: next.deduction_id!, amount: resolveDefaultAmount(next, basic) },
    ]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const basic = Number(basicSalary);
    if (!employeeId) {
      setFormError('Please select an employee.');
      return;
    }
    if (!Number.isFinite(basic) || basic <= 0) {
      setFormError('Basic salary must be greater than zero.');
      return;
    }
    if (!effectiveFrom) {
      setFormError('Effective from date is required.');
      return;
    }

    const allowanceSet = new Set<number>();
    for (const a of assignedAllowances) {
      if (allowanceSet.has(a.id)) {
        setFormError('Duplicate allowance component detected.');
        return;
      }
      allowanceSet.add(a.id);
      if (!Number.isFinite(Number(a.amount)) || Number(a.amount) < 0) {
        setFormError('All allowance amounts must be non-negative numbers.');
        return;
      }
    }

    const deductionSet = new Set<number>();
    for (const d of assignedDeductions) {
      if (deductionSet.has(d.id)) {
        setFormError('Duplicate deduction component detected.');
        return;
      }
      deductionSet.add(d.id);
      if (!Number.isFinite(Number(d.amount)) || Number(d.amount) < 0) {
        setFormError('All deduction amounts must be non-negative numbers.');
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        employee_id: Number(employeeId),
        basic_salary: basic,
        effective_from: effectiveFrom,
        status,
        allowances: assignedAllowances.map((a) => ({ id: a.id, amount: Number(a.amount) })),
        deductions: assignedDeductions.map((d) => ({ id: d.id, amount: Number(d.amount) })),
      };
      if (editingId) {
        await api.put(`/salaries/${editingId}`, payload);
        showToast('Salary structure updated.', 'success');
      } else {
        await api.post('/salaries', payload);
        showToast('Salary structure created.', 'success');
      }
      setModalOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Failed to save salary structure.'));
    } finally {
      setSaving(false);
    }
  };

  // Live preview calculation
  const previewBasic = Number(basicSalary) || 0;
  const previewAllowance = assignedAllowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
  const previewGross = previewBasic + previewAllowance;
  const previewDeduction = assignedDeductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const previewNet = previewGross - previewDeduction;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Salary Structures</h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign basic salary, multiple normalized allowances, and deductions per employee.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Salary Structure</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={7} cols={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAll} />
      ) : structures.length === 0 ? (
        <EmptyState
          title="No salary structures found"
          description="Assign compensation packages to active employees before generating payroll."
          actionLabel="New Salary Structure"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Effective From</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Allowances</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Salary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {structures.map((row) => (
                  <tr key={row.salary_structure_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.employee_name}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {row.employee_code} · {row.designation_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.department_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {formatDate(row.effective_from)}
                    </td>
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
                    <td
                      className={`px-4 py-3 text-xs font-semibold ${
                        row.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {row.status}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                        title="Edit salary structure"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary Structure Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Salary Structure' : 'Create Salary Structure'}
        subtitle="Allowances and deductions are persisted in normalized SALARY_ALLOWANCE and SALARY_DEDUCTION tables."
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Employee *</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
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
              <label className="block text-sm font-medium text-slate-700">Basic Salary ($) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Effective From *</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Allowances List */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Assigned Allowances</h3>
              <button
                type="button"
                onClick={addAllowanceRow}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Allowance</span>
              </button>
            </div>
            {assignedAllowances.length === 0 ? (
              <p className="text-xs text-slate-500">No allowances assigned.</p>
            ) : (
              <div className="space-y-2">
                {assignedAllowances.map((line, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <select
                      value={line.id}
                      onChange={(e) => {
                        const newId = Number(e.target.value);
                        const catalogItem = allowancesCatalog.find((a) => a.allowance_id === newId);
                        const updated = [...assignedAllowances];
                        updated[index] = {
                          id: newId,
                          amount: catalogItem
                            ? resolveDefaultAmount(catalogItem, Number(basicSalary) || 0)
                            : line.amount,
                        };
                        setAssignedAllowances(updated);
                      }}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {allowancesCatalog.map((a) => (
                        <option key={a.allowance_id} value={a.allowance_id}>
                          {a.allowance_name} ({a.allowance_type})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.amount}
                      onChange={(e) => {
                        const updated = [...assignedAllowances];
                        updated[index] = { ...line, amount: e.target.value };
                        setAssignedAllowances(updated);
                      }}
                      className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-right"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAssignedAllowances(assignedAllowances.filter((_, i) => i !== index))
                      }
                      className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deductions List */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Assigned Deductions</h3>
              <button
                type="button"
                onClick={addDeductionRow}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Deduction</span>
              </button>
            </div>
            {assignedDeductions.length === 0 ? (
              <p className="text-xs text-slate-500">No deductions assigned.</p>
            ) : (
              <div className="space-y-2">
                {assignedDeductions.map((line, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <select
                      value={line.id}
                      onChange={(e) => {
                        const newId = Number(e.target.value);
                        const catalogItem = deductionsCatalog.find((d) => d.deduction_id === newId);
                        const updated = [...assignedDeductions];
                        updated[index] = {
                          id: newId,
                          amount: catalogItem
                            ? resolveDefaultAmount(catalogItem, Number(basicSalary) || 0)
                            : line.amount,
                        };
                        setAssignedDeductions(updated);
                      }}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {deductionsCatalog.map((d) => (
                        <option key={d.deduction_id} value={d.deduction_id}>
                          {d.deduction_name} ({d.deduction_type})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.amount}
                      onChange={(e) => {
                        const updated = [...assignedDeductions];
                        updated[index] = { ...line, amount: e.target.value };
                        setAssignedDeductions(updated);
                      }}
                      className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-right"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAssignedDeductions(assignedDeductions.filter((_, i) => i !== index))
                      }
                      className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Salary Calculation Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-600 mb-3">
              Compensation Preview (Without Overtime)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Basic Salary</div>
                <div className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(previewBasic)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Allowance</div>
                <div className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {formatCurrency(previewAllowance)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Gross Salary</div>
                <div className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(previewGross)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Deduction</div>
                <div className="font-mono font-semibold text-amber-700 tabular-nums">
                  {formatCurrency(previewDeduction)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Net Salary</div>
                <div className="font-mono font-bold text-blue-700 tabular-nums">
                  {formatCurrency(previewNet)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
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
              {saving ? 'Saving...' : 'Save Salary Structure'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
