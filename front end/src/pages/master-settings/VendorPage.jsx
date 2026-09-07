import { useEffect, useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { extractErrorMessage, vendorsApi } from '../../api/master'
import DataTable from '../../components/master/DataTable'
import Modal from '../../components/master/Modal'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import PageToolbar from '../../components/master/PageToolbar'
import PartyForm from '../../components/master/PartyForm'
import ToggleSwitch from '../../components/master/ToggleSwitch'
import { ViewCard, ViewField } from '../../components/master/FormField'
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)
  const [viewingVendor, setViewingVendor] = useState(null)

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

  function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    const vendorName = form.name.trim()
    try {
      if (editingId) {
        await vendorsApi.update(editingId, form)
      } else {
        await vendorsApi.create(form)
      }
      setModalOpen(false)
      await load()
      setResultDialog({
        variant: 'success',
        title: editingId ? 'Vendor Updated Successfully' : 'Vendor Added Successfully',
        message: `"${vendorName}" has been ${editingId ? 'updated' : 'added'} successfully.`,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Save Vendor',
        message: extractErrorMessage(err),
      })
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
      

      <main className="space-y-4 px-6 py-6">
      <PageToolbar
        title="Vendor"
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
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            aria-label={`Edit ${row.name}`}
          >
            <Pencil size={14} /> Edit
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
            <PartyForm variant="vendor" form={form} onChange={setForm} />
          </form>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Save Vendor?"
        message={`Are you sure you want to ${editingId ? 'save changes to' : 'add'} "${
          form.name.trim() || 'this vendor'
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

      {viewingVendor && (
        <Modal 
          title="Vendor Details" 
          onClose={() => setViewingVendor(null)} 
          size="xl"
          footer={
            <button
              type="button"
              onClick={() => setViewingVendor(null)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Close
            </button>
          }
        >
          <div className="space-y-6">
            <ViewCard title="Vendor Information">
              <ViewField label="Vendor Name" value={viewingVendor.name} />
              <ViewField label="Contact Person" value={viewingVendor.contact_person} />
              <ViewField label="GSTIN" value={viewingVendor.gst_number} />
              <ViewField label="Status" value={viewingVendor.active ? 'Active' : 'Inactive'} />
            </ViewCard>

            <ViewCard title="Contact & Address">
              <ViewField label="Phone" value={viewingVendor.phone} />
              <ViewField label="Email" value={viewingVendor.email} />
              <ViewField 
                label="Address" 
                value={[
                  viewingVendor.address_line1,
                  viewingVendor.address_line2,
                  viewingVendor.city,
                  viewingVendor.state,
                  viewingVendor.pincode
                ].filter(Boolean).join(', ')} 
              />
            </ViewCard>
          </div>
        </Modal>
      )}
      </main>
    </div>
  )
}
