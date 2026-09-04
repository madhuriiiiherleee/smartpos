import { useEffect, useState } from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { customersApi, extractErrorMessage } from '../../api/master'
import DataTable from '../../components/master/DataTable'
import Modal from '../../components/master/Modal'
import PageToolbar from '../../components/master/PageToolbar'
import ToggleSwitch from '../../components/master/ToggleSwitch'
import { FieldLabel, FormRow, TextInput } from '../../components/master/FormField'
import { AddressFields } from '../../components/master/AddressFields'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const EMPTY_ROUTE = {
  route_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  is_default: false,
}

const EMPTY_FORM = {
  name: '',
  business_name: '',
  margin: '',
  contact_person: '',
  phone: '',
  mobile_number_2: '',
  email: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  gst_number: '',
  selling_price_type: 'Retail',
  active: true,
  routes: [{ ...EMPTY_ROUTE, is_default: true }],
}

export default function CustomerPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [listError, setListError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await customersApi.list({ q: debouncedSearch })
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
    setForm({ ...EMPTY_FORM, routes: [{ ...EMPTY_ROUTE, is_default: true }] })
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(customer) {
    setEditingId(customer.id)
    setForm({
      name: customer.name,
      business_name: customer.business_name || '',
      margin: String(customer.margin ?? 0),
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      mobile_number_2: customer.mobile_number_2 || '',
      email: customer.email || '',
      address_line1: customer.address_line1 || '',
      address_line2: customer.address_line2 || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      gst_number: customer.gst_number || '',
      selling_price_type: customer.selling_price_type || 'Retail',
      active: customer.active,
      routes:
        customer.routes && customer.routes.length > 0
          ? customer.routes.map((r) => ({
              route_name: r.route_name,
              address_line1: r.address_line1 || '',
              address_line2: r.address_line2 || '',
              city: r.city || '',
              state: r.state || '',
              pincode: r.pincode || '',
              is_default: r.is_default,
            }))
          : [{ ...EMPTY_ROUTE, is_default: true }],
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
        ...form,
        margin: Number(form.margin) || 0,
        // The route-editing UI was removed from this form, so the seeded default route has
        // no route_name of its own. Name it after the customer instead of dropping it, so
        // every customer still ends up with at least one usable route (Sales Entry's Route
        // dropdown and delivery grouping both depend on customer.routes being non-empty).
        routes: form.routes
          .map((r) => ({ ...r, route_name: r.route_name.trim() || form.name.trim() || 'Default' }))
          .filter((r) => r.route_name !== ''),
      }
      if (editingId) {
        await customersApi.update(editingId, payload)
      } else {
        await customersApi.create(payload)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(customer) {
    if (!window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) return
    setListError(null)
    try {
      await customersApi.remove(customer.id)
      await load()
    } catch (err) {
      setListError(extractErrorMessage(err))
    }
  }

  async function handleToggleActive(customer, active) {
    setItems((prev) => prev.map((c) => (c.id === customer.id ? { ...c, active } : c)))
    try {
      await customersApi.setActive(customer.id, active)
    } catch {
      setItems((prev) => prev.map((c) => (c.id === customer.id ? { ...c, active: !active } : c)))
    }
  }

  return (
    <div>
      <header className="border-b border-brand-200 bg-brand-100">
        <div className="px-6 py-5">
          <h1 className="text-lg font-semibold text-slate-800">Customer</h1>
          <p className="text-sm text-slate-400">Manage customer records and delivery routes</p>
        </div>
      </header>

      <main className="space-y-4 px-6 py-6">
      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer name..."
        onAdd={openAdd}
        addLabel="Add Customer"
      />

      {listError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{listError}</div>
      )}

      <DataTable
        loading={loading}
        rows={items}
        emptyMessage="No customers found."
        columns={[
          { key: 'name', label: 'Customer Name' },
          { key: 'business_name', label: 'Business Name' },
          { key: 'phone', label: 'Mobile Number' },
          { key: 'gst_number', label: 'GSTIN' },
          { key: 'address_line1', label: 'Address', className: 'max-w-xs truncate' },
          { key: 'active', label: 'Status' },
        ]}
        renderCell={(row, col) => {
          if (col.key === 'active') {
            return <ToggleSwitch checked={row.active} onChange={(v) => handleToggleActive(row, v)} />
          }
          return row[col.key] || <span className="text-slate-300">—</span>
        }}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setViewingCustomer(row)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
              aria-label={`View ${row.name}`}
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
              aria-label={`Edit ${row.name}`}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
              aria-label={`Delete ${row.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      />

      {modalOpen && (
        <Modal
          title={editingId ? 'Edit Customer' : 'Add Customer'}
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
                form="customer-form"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {formError}
              </div>
            )}
            <FormRow cols={2}>
              <div>
                <FieldLabel required>Customer Name</FieldLabel>
                <TextInput
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel required>Business Name</FieldLabel>
                <TextInput
                  required
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                />
              </div>
            </FormRow>

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
                <FieldLabel>Mobile Number 2</FieldLabel>
                <TextInput
                  value={form.mobile_number_2}
                  onChange={(e) => setForm({ ...form, mobile_number_2: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </FormRow>

            <FormRow cols={2}>
              <div>
                <FieldLabel>GST Number</FieldLabel>
                <TextInput
                  value={form.gst_number}
                  onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel required>Margin (%)</FieldLabel>
                <TextInput
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.margin}
                  onChange={(e) => setForm({ ...form, margin: e.target.value })}
                />
              </div>
            </FormRow>

            <AddressFields value={form} onChange={(patch) => setForm({ ...form, ...patch })} />
          </form>
        </Modal>
      )}

      {viewingCustomer && (
        <Modal title="Customer Details" onClose={() => setViewingCustomer(null)} wide>
          <div className="space-y-4">
            <FormRow cols={2}>
              <ViewField label="Customer Name" value={viewingCustomer.name} />
              <ViewField label="Business Name" value={viewingCustomer.business_name} />
            </FormRow>
            <FormRow cols={2}>
              <ViewField label="Contact Person" value={viewingCustomer.contact_person} />
              <ViewField label="Mobile Number" value={viewingCustomer.phone} />
            </FormRow>
            <FormRow cols={2}>
              <ViewField label="Mobile Number 2" value={viewingCustomer.mobile_number_2} />
            </FormRow>
            <FormRow cols={2}>
              <ViewField label="Email" value={viewingCustomer.email} />
              <ViewField label="GSTIN" value={viewingCustomer.gst_number} />
            </FormRow>
            <FormRow cols={2}>
              <ViewField label="Margin (%)" value={viewingCustomer.margin} />
              <ViewField label="Status" value={viewingCustomer.active ? 'Active' : 'Inactive'} />
            </FormRow>
            <ViewField label="Balance" value={viewingCustomer.balance} />
            <ViewField label="Address" value={formatAddress(viewingCustomer)} />
          </div>
        </Modal>
      )}
      </main>
    </div>
  )
}

function formatAddress(a) {
  if (!a) return ''
  return [a.address_line1, a.address_line2, a.city, a.state, a.pincode].filter(Boolean).join(', ')
}

function ViewField({ label, value }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="text-sm text-slate-700">{value || <span className="text-slate-300">—</span>}</p>
    </div>
  )
}
