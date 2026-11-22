import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Search, UserX } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';
import { useToast } from '../components/Toast.tsx';

interface Department {
  department_id: number;
  department_name: string;
}

interface Designation {
  designation_id: number;
  designation_name: string;
}

interface Employee {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hire_date: string;
  department_id: number;
  designation_id: number;
  department_name: string;
  designation_name: string;
  employment_status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  current_basic_salary: number | null;
}

const INITIAL_FORM = {
  employee_code: '',
  first_name: '',
  last_name: '',
  gender: 'Male',
  date_of_birth: '',
  phone: '',
  email: '',
  address: '',
  hire_date: new Date().toISOString().slice(0, 10),
  department_id: '',
  designation_id: '',
  employment_status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'TERMINATED',
};

export function EmployeesPage() {
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMetadata = useCallback(async () => {
    const [deptRes, desigRes] = await Promise.all([
      api.get<{ data: Department[] }>('/departments'),
      api.get<{ data: Designation[] }>('/designations'),
    ]);
    setDepartments(deptRes.data.data);
    setDesignations(desigRes.data.data);
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (departmentFilter) params.department_id = departmentFilter;
      if (designationFilter) params.designation_id = designationFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get<{ data: Employee[] }>('/employees', { params });
      setEmployees(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load employees.'));
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter, designationFilter, statusFilter]);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEmployees();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadEmployees]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setForm({
      ...INITIAL_FORM,
      department_id: departments[0] ? String(departments[0].department_id) : '',
      designation_id: designations[0] ? String(designations[0].designation_id) : '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      employee_code: emp.employee_code,
      first_name: emp.first_name,
      last_name: emp.last_name || '',
      gender: emp.gender || 'Male',
      date_of_birth: emp.date_of_birth ? String(emp.date_of_birth).slice(0, 10) : '',
      phone: emp.phone || '',
      email: emp.email || '',
      address: emp.address || '',
      hire_date: emp.hire_date ? String(emp.hire_date).slice(0, 10) : '',
      department_id: String(emp.department_id),
      designation_id: String(emp.designation_id),
      employment_status: emp.employment_status,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const validateForm = (): string | null => {
    if (!form.employee_code.trim()) return 'Employee code is required.';
    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'A valid email address is required.';
    }
    if (form.phone.trim() && !/^[0-9+\-()\s]{7,20}$/.test(form.phone.trim())) {
      return 'Phone number must be 7 to 20 characters (digits, +, -, spaces).';
    }
    if (!form.hire_date) return 'Hire date is required.';
    if (form.date_of_birth && form.date_of_birth >= form.hire_date) {
      return 'Date of birth must be earlier than hire date.';
    }
    if (!form.department_id) return 'Please select a department.';
    if (!form.designation_id) return 'Please select a designation.';
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        department_id: Number(form.department_id),
        designation_id: Number(form.designation_id),
      };
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.employee_id}`, payload);
        showToast('Employee record updated.', 'success');
      } else {
        await api.post('/employees', payload);
        showToast('Employee added successfully.', 'success');
      }
      setFormOpen(false);
      await loadEmployees();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Failed to save employee.'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete<{ message: string }>(`/employees/${confirmTarget.employee_id}`);
      showToast(res.data.message || 'Employee deactivated.', 'success');
      setConfirmTarget(null);
      await loadEmployees();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to deactivate employee.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'ACTIVE') return 'text-emerald-700';
    if (status === 'INACTIVE') return 'text-amber-700';
    return 'text-red-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage staff profiles, department assignments, and employment statuses.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, email..."
            aria-label="Search employees"
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          aria-label="Filter by department"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.department_id} value={d.department_id}>
              {d.department_name}
            </option>
          ))}
        </select>

        <select
          value={designationFilter}
          onChange={(e) => setDesignationFilter(e.target.value)}
          aria-label="Filter by designation"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700"
        >
          <option value="">All Designations</option>
          {designations.map((d) => (
            <option key={d.designation_id} value={d.designation_id}>
              {d.designation_name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="TERMINATED">TERMINATED</option>
        </select>
      </div>

      {/* Data Table */}
      {loading ? (
        <TableSkeleton rows={7} cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadEmployees} />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No matching employees"
          description="Try clearing your filters or register a new employee record."
          actionLabel="Add Employee"
          onAction={openCreateModal}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3 text-right">Basic Salary</th>
                  <th className="px-4 py-3">Hire Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {employees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">
                      {emp.employee_code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {emp.first_name} {emp.last_name || ''}
                      </div>
                      <div className="text-xs text-slate-500">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{emp.department_name}</td>
                    <td className="px-4 py-3 text-slate-700">{emp.designation_name}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {emp.current_basic_salary !== null
                        ? formatCurrency(emp.current_basic_salary)
                        : 'Not assigned'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {formatDate(emp.hire_date)}
                    </td>
                    <td className={`px-4 py-3 text-xs font-semibold ${statusColor(emp.employment_status)}`}>
                      {emp.employment_status}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingEmployee(emp)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="View employee details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                          title="Edit employee"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(emp)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          title="Deactivate or delete employee"
                        >
                          <UserX className="h-4 w-4" />
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

      {/* Create / Edit Employee Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingEmployee ? `Edit Employee · ${editingEmployee.employee_code}` : 'Add New Employee'}
        subtitle="All fields are validated on both client and Express backend."
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Employee Code *</label>
              <input
                type="text"
                value={form.employee_code}
                onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                placeholder="e.g. EMP023"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Employment Status *</label>
              <select
                value={form.employment_status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    employment_status: e.target.value as 'ACTIVE' | 'INACTIVE' | 'TERMINATED',
                  })
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">First Name *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555-0199"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Department *</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Designation *</label>
              <select
                value={form.designation_id}
                onChange={(e) => setForm({ ...form, designation_id: e.target.value })}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select designation</option>
                {designations.map((d) => (
                  <option key={d.designation_id} value={d.designation_id}>
                    {d.designation_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Hire Date *</label>
              <input
                type="date"
                value={form.hire_date}
                onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Employee Modal */}
      <Modal
        open={Boolean(viewingEmployee)}
        onClose={() => setViewingEmployee(null)}
        title={
          viewingEmployee
            ? `${viewingEmployee.first_name} ${viewingEmployee.last_name || ''}`
            : 'Employee Details'
        }
        subtitle={
          viewingEmployee
            ? `${viewingEmployee.employee_code} · ${viewingEmployee.department_name} · ${viewingEmployee.designation_name}`
            : undefined
        }
      >
        {viewingEmployee && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{viewingEmployee.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{viewingEmployee.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Gender</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{viewingEmployee.gender || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date of Birth</dt>
              <dd className="mt-0.5 font-mono text-slate-900">
                {formatDate(viewingEmployee.date_of_birth)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Hire Date</dt>
              <dd className="mt-0.5 font-mono text-slate-900">
                {formatDate(viewingEmployee.hire_date)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Employment Status</dt>
              <dd className={`mt-0.5 font-semibold ${statusColor(viewingEmployee.employment_status)}`}>
                {viewingEmployee.employment_status}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Active Basic Salary</dt>
              <dd className="mt-0.5 font-mono font-semibold text-slate-900">
                {viewingEmployee.current_basic_salary !== null
                  ? formatCurrency(viewingEmployee.current_basic_salary)
                  : 'Not configured'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Address</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {viewingEmployee.address || '—'}
              </dd>
            </div>
          </dl>
        )}
      </Modal>

      {/* Deactivate / Delete Confirm */}
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Deactivate or Delete Employee"
        message={
          confirmTarget
            ? `Are you sure you want to remove/deactivate ${confirmTarget.first_name} ${confirmTarget.last_name || ''} (${confirmTarget.employee_code})? Employees with payroll history are automatically marked INACTIVE to preserve audit integrity.`
            : ''
        }
        confirmLabel="Proceed"
        danger
        loading={deleting}
      />
    </div>
  );
}
