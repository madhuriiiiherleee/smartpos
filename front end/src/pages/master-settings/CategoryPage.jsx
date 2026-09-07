import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { categoriesApi, extractErrorMessage } from '../../api/master'
import DataTable from '../../components/master/DataTable'
import Modal from '../../components/master/Modal'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import PageToolbar from '../../components/master/PageToolbar'
import ToggleSwitch from '../../components/master/ToggleSwitch'
import { FieldLabel, FormRow, TextInput } from '../../components/master/FormField'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const EMPTY_FORM = { code: '', name: '', active: true }

export default function CategoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resultDialog, setResultDialog] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await categoriesApi.list({ q: debouncedSearch })
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [debouncedSearch])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(category) {
    setEditingId(category.id)
    setForm({ code: category.code, name: category.name, active: category.active })
    setFormError(null)
    setModalOpen(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    const categoryName = form.name.trim()
    try {
      if (editingId) {
        await categoriesApi.update(editingId, form)
      } else {
        await categoriesApi.create(form)
      }
      setModalOpen(false)
      await load()
      setResultDialog({
        variant: 'success',
        title: editingId ? 'Category Updated Successfully' : 'Category Added Successfully',
        message: `"${categoryName}" has been ${editingId ? 'updated' : 'added'} successfully.`,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Save Category',
        message: extractErrorMessage(err),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(category, active) {
    setItems((prev) => prev.map((c) => (c.id === category.id ? { ...c, active } : c)))
    try {
      await categoriesApi.setActive(category.id, active)
    } catch {
      setItems((prev) => prev.map((c) => (c.id === category.id ? { ...c, active: !active } : c)))
    }
  }

  async function doDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    const name = deleteTarget.name
    setDeleteTarget(null)
    setLoading(true)
    try {
      await categoriesApi.remove(id)
      await load()
      setResultDialog({
        variant: 'success',
        title: 'Category Deleted',
        message: `"${name}" has been deleted successfully.`,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Delete Category',
        message: extractErrorMessage(err) || 'This category may be in use by products.',
      })
      setLoading(false)
    }
  }


  return (
    <div>
      

      <main className="space-y-4 px-6 py-6">
      <PageToolbar
        title="Category"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by code or name..."
        onAdd={openAdd}
        addLabel="Add Category"
      />

      <DataTable
        loading={loading}
        rows={items}
        emptyMessage="No categories found."
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'active', label: 'Status' },
        ]}
        renderCell={(row, col) => {
          if (col.key === 'active') {
            return <ToggleSwitch checked={row.active} onChange={(v) => handleToggleActive(row, v)} />
          }
          return row[col.key]
        }}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              aria-label={`Edit ${row.name}`}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
              aria-label={`Delete ${row.name}`}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      />

      {modalOpen && (
        <Modal
          title={editingId ? 'Edit Category' : 'Add Category'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="category-form"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {formError}
              </div>
            )}
            <FormRow cols={2}>
              <div>
                <FieldLabel required>Code</FieldLabel>
                <TextInput
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. CAT-SCO"
                />
              </div>
              <div>
                <FieldLabel required>Name</FieldLabel>
                <TextInput
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Scoop"
                />
              </div>
            </FormRow>
          </form>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Save Category?"
        message={`Are you sure you want to ${editingId ? 'save changes to' : 'add'} "${form.name
          .trim() || 'this category'}"?`}
        confirmLabel="Save"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSave}
        busy={saving}
      />
      <AlertDialog
        open={resultDialog != null}
        variant={resultDialog?.variant ?? 'success'}
        title={resultDialog?.title ?? ''}
        message={resultDialog?.message ?? ''}
        onClose={() => setResultDialog(null)}
      />
      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete Category?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        busy={loading}
      />
      </main>
    </div>
  )
}
