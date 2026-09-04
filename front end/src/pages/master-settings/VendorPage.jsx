import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { extractErrorMessage, vendorsApi } from '../../api/master'
import DataTable from '../../components/master/DataTable'
import Modal from '../../components/master/Modal'
import PageToolbar from '../../components/master/PageToolbar'
import ToggleSwitch from '../../components/master/ToggleSwitch'
import { FieldLabel, FormRow, TextInput } from '../../components/master/FormField'
import { AddressFields } from '../../components/master/AddressFields'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const EMPTY_FORM = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  gst_number: '',
  active: true,
}

export default function VendorPage() {
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
      const data = await vendorsApi.list({ q: debouncedSearch })
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

  function openEdit(vendor) {
    setEditingId(vendor.id)
    setForm({
      name: vendor.name,
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address_line1: vendor.address_line1 || '',
      address_line2: vendor.address_line2 || '',
      city: vendor.city || '',
      state: vendor.state || '',
      pincode: vendor.pincode || '',
      gst_number: vendor.gst_number || '',
      active: vendor.active,
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        await vendorsApi.update(editingId, form)
      } else {
        await vendorsApi.create(form)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(vendor, active) {
    setItems((prev) => prev.map((v) => (v.id === vendor.id ? { ...v, active } : v)))
    try {
      await vendorsApi.setActive(vendor.id, active)
    } catch {
      setItems((prev) => prev.map((v) => (v.id === vendor.id ? { ...v, active: !active } : v)))
    }
  }

  return (
    <div>
      <header className="border-b border-brand-200 bg-brand-100">
        <div className="px-6 py-5">
          <h1 className="text-lg font-semibold text-slate-800">Vendor</h1>
          <p className="text-sm text-slate-400">Manage vendor and supplier records</p>
        </div>
      </header>

      <main className="space-y-4 px-6 py-6">
      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by vendor name..."
        onAdd={openAdd}
        addLabel="Add Vendor"
      />

      <DataTable
        loading={loading}
        rows={items}
        emptyMessage="No vendors found."
        columns={[
          { key: 'name', label: 'Vendor Name' },
          { key: 'contact_person', label: 'Contact Person' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'gst_number', label: 'GST Number' },
          { key: 'active', label: 'Status' },
        ]}
        renderCell={(row, col) => {
          if (col.key === 'active') {
            return <ToggleSwitch checked={row.active} onChange={(v) => handleToggleActive(row, v)} />
          }
          return row[col.key] || <span className="text-slate-300">—</span>
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
          title={editingId ? 'Edit Vendor' : 'Add Vendor'}
          onClose={() => setModalOpen(false)}
          wide
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
                form="vendor-form"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <form id="vendor-form" onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {formError}
              </div>
            )}
            <div>
              <FieldLabel required>Vendor Name</FieldLabel>
              <TextInput
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Vendor / supplier name"
              />
            </div>

            <FormRow cols={2}>
              <div>
                <FieldLabel>Contact Person</FieldLabel>
                <TextInput
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </FormRow>

            <FormRow cols={2}>
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>GST Number</FieldLabel>
                <TextInput
                  value={form.gst_number}
                  onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                />
              </div>
            </FormRow>

            <AddressFields value={form} onChange={(patch) => setForm({ ...form, ...patch })} />
          </form>
        </Modal>
      )}
      </main>
    </div>
  )
}
