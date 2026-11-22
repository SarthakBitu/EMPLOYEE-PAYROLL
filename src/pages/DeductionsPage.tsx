import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';
import { useToast } from '../components/Toast.tsx';

interface Deduction {
  deduction_id: number;
  deduction_name: string;
  deduction_type: 'FIXED' | 'PERCENTAGE';
  default_amount: number;
  description: string | null;
}

export function DeductionsPage() {
  const { showToast } = useToast();
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deduction | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [defaultAmount, setDefaultAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Deduction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDeductions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Deduction[] }>('/deductions');
      setDeductions(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load deductions.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeductions();
  }, [loadDeductions]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setType('FIXED');
    setDefaultAmount('0');
    setDescription('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Deduction) => {
    setEditing(item);
    setName(item.deduction_name);
    setType(item.deduction_type);
    setDefaultAmount(String(item.default_amount));
    setDescription(item.description || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(defaultAmount);
    if (!name.trim()) {
      setFormError('Deduction name is required.');
      return;
    }
    if (!Number.isFinite(num) || num < 0) {
      setFormError('Default amount must be a non-negative number.');
      return;
    }
    if (type === 'PERCENTAGE' && num > 100) {
      setFormError('Percentage deduction cannot exceed 100%.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        deduction_name: name.trim(),
        deduction_type: type,
        default_amount: num,
        description: description.trim() || null,
      };
      if (editing) {
        await api.put(`/deductions/${editing.deduction_id}`, payload);
        showToast('Deduction updated.', 'success');
      } else {
        await api.post('/deductions', payload);
        showToast('Deduction created.', 'success');
      }
      setModalOpen(false);
      await loadDeductions();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Failed to save deduction.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/deductions/${deleteTarget.deduction_id}`);
      showToast('Deduction deleted.', 'success');
      setDeleteTarget(null);
      await loadDeductions();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Cannot delete deduction.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Deductions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Normalized deduction master catalog assigned via SALARY_DEDUCTION junction rows.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Deduction</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDeductions} />
      ) : deductions.length === 0 ? (
        <EmptyState
          title="No deductions configured"
          description="Define statutory deductions such as Income Tax, Provident Fund, or Insurance."
          actionLabel="Add Deduction"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Deduction Name</th>
                  <th className="px-4 py-3">Calculation Type</th>
                  <th className="px-4 py-3 text-right">Default Value</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {deductions.map((item) => (
                  <tr key={item.deduction_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.deduction_name}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">
                      {item.deduction_type}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700 font-medium">
                      {item.deduction_type === 'PERCENTAGE'
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
        title={editing ? 'Edit Deduction' : 'Add Deduction'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Deduction Name *</label>
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
              {saving ? 'Saving...' : 'Save Deduction'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Deduction"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.deduction_name}"? Deductions linked to existing salary structures cannot be deleted.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
