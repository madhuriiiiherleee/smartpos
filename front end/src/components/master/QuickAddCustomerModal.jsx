import { useState } from 'react'
import { customersApi, extractErrorMessage } from '../../api/master'
import { FieldLabel, FormRow, TextInput } from './FormField'
import { AddressFields } from './AddressFields'
import Modal from './Modal'

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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = await customersApi.create({
        ...quickForm,
        margin: Number(quickForm.margin) || 0,
      })
      onCreated(created)
    } catch (err) {
      setError(extractErrorMessage(err))
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
        <FormRow cols={2}>
          <div>
            <FieldLabel required>Customer Name</FieldLabel>
            <TextInput
              required
              value={quickForm.name}
              onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel required>Business Name</FieldLabel>
            <TextInput
              required
              value={quickForm.business_name}
              onChange={(e) => setQuickForm({ ...quickForm, business_name: e.target.value })}
            />
          </div>
        </FormRow>

        <FormRow cols={2}>
          <div>
            <FieldLabel>Contact Person</FieldLabel>
            <TextInput
              value={quickForm.contact_person}
              onChange={(e) => setQuickForm({ ...quickForm, contact_person: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <TextInput
              value={quickForm.phone}
              onChange={(e) => setQuickForm({ ...quickForm, phone: e.target.value })}
            />
          </div>
        </FormRow>

        <FormRow cols={2}>
          <div>
            <FieldLabel>Mobile Number 2</FieldLabel>
            <TextInput
              value={quickForm.mobile_number_2}
              onChange={(e) => setQuickForm({ ...quickForm, mobile_number_2: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput
              type="email"
              value={quickForm.email}
              onChange={(e) => setQuickForm({ ...quickForm, email: e.target.value })}
            />
          </div>
        </FormRow>

        <FormRow cols={2}>
          <div>
            <FieldLabel>GST Number</FieldLabel>
            <TextInput
              value={quickForm.gst_number}
              onChange={(e) => setQuickForm({ ...quickForm, gst_number: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel required>Margin (%)</FieldLabel>
            <TextInput
              required
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={quickForm.margin}
              onChange={(e) => setQuickForm({ ...quickForm, margin: e.target.value })}
            />
          </div>
        </FormRow>

        <AddressFields value={quickForm} onChange={(patch) => setQuickForm({ ...quickForm, ...patch })} />
      </form>
    </Modal>
  )
}
