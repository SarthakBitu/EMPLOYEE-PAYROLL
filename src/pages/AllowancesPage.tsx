import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';
import { useToast } from '../components/Toast.tsx';

interface Allowance {
  allowance_id: number;
  allowance_name: string;
  allowance_type: 'FIXED' | 'PERCENTAGE';
  default_amount: number;
  description: string | null;
}

export function AllowancesPage() {
  const { showToast } = useToast();
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Allowance | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [defaultAmount, setDefaultAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Allowance | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAllowances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Allowance[] }>('/allowances');
      setAllowances(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load allowances.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllowances();
  }, [loadAllowances]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setType('FIXED');
    setDefaultAmount('0');
    setDescription('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Allowance) => {
    setEditing(item);
    setName(item.allowance_name);
    setType(item.allowance_type);
    setDefaultAmount(String(item.default_amount));
    setDescription(item.description || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(defaultAmount);
    if (!name.trim()) {
      setFormError('Allowance name is required.');
      return;
    }
    if (!Number.isFinite(num) || num < 0) {
      setFormError('Default amount must be a non-negative number.');
      return;
    }
    if (type === 'PERCENTAGE' && num > 100) {
      setFormError('Percentage allowance cannot exceed 100%.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        allowance_name: name.trim(),
        allowance_type: type,
        default_amount: num,
        description: description.trim() || null,
      };
      if (editing) {
        await api.put(`/allowances/${editing.allowance_id}`, payload);
        showToast('Allowance updated.', 'success');
      } else {
        await api.post('/allowances', payload);
        showToast('Allowance created.', 'success');
      }
      setModalOpen(false);
      await loadAllowances();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Failed to save allowance.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/allowances/${deleteTarget.allowance_id}`);
      showToast('Allowance deleted.', 'success');
      setDeleteTarget(null);
      await loadAllowances();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Cannot delete allowance.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Allowances</h1>
          <p className="mt-1 text-sm text-slate-500">
            Normalized allowance master catalog assigned via SALARY_ALLOWANCE junction rows.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Allowance</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAllowances} />
      ) : allowances.length === 0 ? (
        <EmptyState
          title="No allowances configured"
          description="Define allowance components such as HRA, Transport, or Bonus."
          actionLabel="Add Allowance"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Allowance Name</th>
                  <th className="px-4 py-3">Calculation Type</th>
                  <th className="px-4 py-3 text-right">Default Value</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {allowances.map((item) => (
                  <tr key={item.allowance_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.allowance_name}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">
                      {item.allowance_type}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      {item.allowance_type === 'PERCENTAGE'
                        ? `${Number(item.default_amount).toFixed(2)}%`
                        : formatCurrency(item.default_amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Allowance' : 'Add Allowance'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Allowance Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'FIXED' | 'PERCENTAGE')}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="FIXED">FIXED ($)</option>
                <option value="PERCENTAGE">PERCENTAGE (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Default {type === 'PERCENTAGE' ? '(%)' : '($)'} *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {saving ? 'Saving...' : 'Save Allowance'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Allowance"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.allowance_name}"? Allowances linked to existing salary structures cannot be deleted.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
