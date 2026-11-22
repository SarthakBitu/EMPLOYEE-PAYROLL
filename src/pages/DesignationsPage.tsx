import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, extractErrorMessage } from '../services/api.ts';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateViews.tsx';
import { useToast } from '../components/Toast.tsx';

interface Designation {
  designation_id: number;
  designation_name: string;
  description: string | null;
  employee_count: number;
}

export function DesignationsPage() {
  const { showToast } = useToast();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDesignations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Designation[] }>('/designations');
      setDesignations(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load designations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDesignations();
  }, [loadDesignations]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: Designation) => {
    setEditing(item);
    setName(item.designation_name);
    setDescription(item.description || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Designation name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.put(`/designations/${editing.designation_id}`, {
          designation_name: name.trim(),
          description: description.trim() || null,
        });
        showToast('Designation updated.', 'success');
      } else {
        await api.post('/designations', {
          designation_name: name.trim(),
          description: description.trim() || null,
        });
        showToast('Designation created.', 'success');
      }
      setModalOpen(false);
      await loadDesignations();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Failed to save designation.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/designations/${deleteTarget.designation_id}`);
      showToast('Designation deleted.', 'success');
      setDeleteTarget(null);
      await loadDesignations();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Cannot delete designation.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Designations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Job roles and functional titles assigned to employees.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Designation</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDesignations} />
      ) : designations.length === 0 ? (
        <EmptyState
          title="No designations found"
          description="Add job roles so employees can be categorized."
          actionLabel="Add Designation"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Designation Title</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Employees</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {designations.map((des) => (
                  <tr key={des.designation_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      #{des.designation_id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {des.designation_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{des.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {des.employee_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(des)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                          title="Edit designation"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(des)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          title="Delete designation"
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
        title={editing ? 'Edit Designation' : 'Add Designation'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Designation Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={3}
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
              {saving ? 'Saving...' : 'Save Designation'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Designation"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.designation_name}"? Designations currently assigned to employees cannot be deleted.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
