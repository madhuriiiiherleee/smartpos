import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { categoriesApi, extractErrorMessage } from '../../api/master'
import DataTable from '../../components/master/DataTable'
import Modal from '../../components/master/Modal'
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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        await categoriesApi.update(editingId, form)
      } else {
        await categoriesApi.create(form)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(extractErrorMessage(err))
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

  return (
    <div>
      <header className="border-b border-brand-200 bg-brand-100">
        <div className="px-6 py-5">
          <h1 className="text-lg font-semibold text-slate-800">Category</h1>
          <p className="text-sm text-slate-400">Manage product categories</p>
        </div>
      </header>

      <main className="space-y-4 px-6 py-6">
      <PageToolbar
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
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
            aria-label={`Edit ${row.name}`}
          >
            <Pencil size={16} />
          </button>
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
                  placeholder="e.g. CAT-ELEC"
                />
              </div>
              <div>
                <FieldLabel required>Name</FieldLabel>
                <TextInput
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Electronics"
                />
              </div>
            </FormRow>
          </form>
        </Modal>
      )}
      </main>
    </div>
  )
}
