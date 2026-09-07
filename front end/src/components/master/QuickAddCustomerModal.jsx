import { useState } from 'react'
import { customersApi, extractErrorMessage } from '../../api/master'
import PartyForm from './PartyForm'
import Modal from './Modal'
import AlertDialog from '../shared/AlertDialog'
import ConfirmDialog from '../shared/ConfirmDialog'

const EMPTY_QUICK_CUSTOMER = {
  name: '',
  business_name: '',
  margin: '',
  contact_person: '',
  phone: '',
  mobile_number_2: '',
  email: '',
  gst_number: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
}

export default function QuickAddCustomerModal({ onClose, onCreated }) {
  const [quickForm, setQuickForm] = useState(EMPTY_QUICK_CUSTOMER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    const customerName = quickForm.name.trim()
    try {
      const created = await customersApi.create({
        ...quickForm,
        margin: Number(quickForm.margin) || 0,
      })
      setResultDialog({
        variant: 'success',
        title: 'Customer Added Successfully',
        message: `"${customerName}" has been added successfully.`,
        completed: created,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Add Customer',
        message: extractErrorMessage(err),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Add Customer"
      onClose={onClose}
      wide
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="quick-add-customer-form"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="quick-add-customer-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
        )}
        <PartyForm form={quickForm} onChange={setQuickForm} />
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Add Customer?"
        message={`Are you sure you want to add "${quickForm.name.trim() || 'this customer'}"?`}
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
        onClose={() => {
          const created = resultDialog?.completed
          setResultDialog(null)
          if (created && typeof onCreated === 'function') {
            onCreated(created)
          }
        }}
      />
    </Modal>
  )
}
