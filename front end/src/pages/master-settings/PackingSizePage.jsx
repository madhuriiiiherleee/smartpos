import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { extractErrorMessage, packingSizesApi } from '../../api/master'
import DataTable from '../../components/master/DataTable'
import Modal from '../../components/master/Modal'
import PageToolbar from '../../components/master/PageToolbar'
import ToggleSwitch from '../../components/master/ToggleSwitch'
import { FieldLabel, FormRow, TextInput } from '../../components/master/FormField'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const EMPTY_FORM = { value: '', unit: '', active: true }

export default function PackingSizePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [listError, setListError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await packingSizesApi.list({ q: debouncedSearch })
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

  function openEdit(packingSize) {
    setEditingId(packingSize.id)
    setForm({
      value: packingSize.value ?? '',
      unit: packingSize.unit,
      active: packingSize.active,
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        value: form.value === '' ? null : Number(form.value),
        unit: form.unit,
        active: form.active,
      }
      if (editingId) {
        await packingSizesApi.update(editingId, payload)
      } else {
        await packingSizesApi.create(payload)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(packingSize) {
    if (!window.confirm(`Delete packing size "${packingSize.label}"? This cannot be undone.`)) return
    setListError(null)
    try {
      await packingSizesApi.remove(packingSize.id)
      await load()
    } catch (err) {
      setListError(extractErrorMessage(err))
    }
  }

  async function handleToggleActive(packingSize, active) {
    setItems((prev) => prev.map((p) => (p.id === packingSize.id ? { ...p, active } : p)))
    try {
      await packingSizesApi.setActive(packingSize.id, active)
    } catch {
      setItems((prev) => prev.map((p) => (p.id === packingSize.id ? { ...p, active: !active } : p)))
    }
  }

  return (
    <div>
      <header className="border-b border-brand-200 bg-brand-100">
        <div className="px-6 py-5">
          <h1 className="text-lg font-semibold text-slate-800">Packing Size</h1>
          <p className="text-sm text-slate-400">
            Manage the packing sizes (e.g. 100 ML, 500 ML, 1 KG) used across products
          </p>
        </div>
      </header>

      <main className="space-y-4 px-6 py-6">
        <PageToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by unit or size..."
          onAdd={openAdd}
          addLabel="Add Packing Size"
        />

        {listError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {listError}
          </div>
        )}

        <DataTable
          loading={loading}
          rows={items}
          emptyMessage="No packing sizes found."
          columns={[
            { key: 'label', label: 'Packing Size' },
            { key: 'unit', label: 'Unit' },
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                aria-label={`Edit ${row.label}`}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(row)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
                aria-label={`Delete ${row.label}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        />

        {modalOpen && (
          <Modal
            title={editingId ? 'Edit Packing Size' : 'Add Packing Size'}
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
                  form="packing-size-form"
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            }
          >
            <form id="packing-size-form" onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                  {formError}
                </div>
              )}
              <FormRow cols={2}>
                <div>
                  <FieldLabel>Value</FieldLabel>
                  <TextInput
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <FieldLabel required>Unit</FieldLabel>
                  <TextInput
                    required
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="e.g. ML, KG, Piece"
                  />
                </div>
              </FormRow>

              <p className="text-xs text-slate-400">
                Preview:{' '}
                <span className="font-medium text-slate-600">
                  {form.value ? `${form.value} ${form.unit || ''}` : form.unit || '—'}
                </span>
              </p>
            </form>
          </Modal>
        )}
      </main>
    </div>
  )
}
