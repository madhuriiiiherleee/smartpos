import { useEffect, useState } from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { customersApi, extractErrorMessage } from '../../api/master'
import PartyForm from '../../components/master/PartyForm'
import DataTable from '../../components/master/DataTable'
import Modal from '../../components/master/Modal'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import PageToolbar from '../../components/master/PageToolbar'
import ToggleSwitch from '../../components/master/ToggleSwitch'
import { FieldLabel, FormRow, ViewCard, ViewField } from '../../components/master/FormField'
import { formatCurrency } from '../../lib/format'
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

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

  function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setConfirmOpen(true)
  }

  async function doSave() {
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
    setConfirmOpen(false)
    setSaving(true)
    const customerName = form.name.trim()
    try {
      if (editingId) {
        await customersApi.update(editingId, payload)
      } else {
        await customersApi.create(payload)
      }
      setModalOpen(false)
      await load()
      setResultDialog({
        variant: 'success',
        title: editingId ? 'Customer Updated Successfully' : 'Customer Added Successfully',
        message: `"${customerName}" has been ${editingId ? 'updated' : 'added'} successfully.`,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Save Customer',
        message: extractErrorMessage(err),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(customer) {
    setDeleteTarget(customer)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const customer = deleteTarget
    setDeleteTarget(null)
    setListError(null)
    try {
      await customersApi.remove(customer.id)
      await load()
      setResultDialog({
        variant: 'success',
        title: 'Customer Deleted Successfully',
        message: `"${customer.name}" has been deleted successfully.`,
      })
    } catch (err) {
      setListError(extractErrorMessage(err))
      setResultDialog({
        variant: 'error',
        title: 'Failed to Delete Customer',
        message: extractErrorMessage(err),
      })
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
      

      <main className="space-y-4 px-6 py-6">
      <PageToolbar
        title="Customer"
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
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
              aria-label={`View ${row.name}`}
            >
              <Eye size={14} /> View
            </button>
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
              onClick={() => handleDelete(row)}
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
            <PartyForm form={form} onChange={setForm} />
          </form>
        </Modal>
      )}

      {viewingCustomer && (
        <Modal 
          title="Customer Details" 
          onClose={() => setViewingCustomer(null)} 
          size="xl"
          footer={
            <button
              type="button"
              onClick={() => setViewingCustomer(null)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Close
            </button>
          }
        >
          <div className="space-y-6">
            <ViewCard title="Business Information">
              <ViewField label="Customer Name" value={viewingCustomer.name} />
              <ViewField label="Business Name" value={viewingCustomer.business_name} />
              <ViewField label="GSTIN" value={viewingCustomer.gst_number} />
              <ViewField label="Status" value={viewingCustomer.active ? 'Active' : 'Inactive'} />
              <ViewField label="Margin (%)" value={viewingCustomer.margin} />
              <ViewField label="Balance" value={formatCurrency(viewingCustomer.balance)} />
            </ViewCard>

            <ViewCard title="Contact & Address">
              <ViewField label="Contact Person" value={viewingCustomer.contact_person} />
              <ViewField label="Email" value={viewingCustomer.email} />
              <ViewField label="Mobile Number" value={viewingCustomer.phone} />
              <ViewField label="Mobile Number 2" value={viewingCustomer.mobile_number_2} />
              <ViewField label="Address" value={formatAddress(viewingCustomer)} />
            </ViewCard>
          </div>
        </Modal>
      )}
      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete Customer?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Save Customer?"
        message={`Are you sure you want to ${editingId ? 'save changes to' : 'add'} "${
          form.name.trim() || 'this customer'
        }"?`}
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
      </main>
    </div>
  )
}

function formatAddress(a) {
  if (!a) return ''
  return [a.address_line1, a.address_line2, a.city, a.state, a.pincode].filter(Boolean).join(', ')
}
