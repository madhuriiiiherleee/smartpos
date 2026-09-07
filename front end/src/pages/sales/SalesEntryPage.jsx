import { useEffect, useState } from 'react'
import {Plus} from 'lucide-react'
import {useNavigate, useParams, Link} from 'react-router-dom'
import { customersApi } from '../../api/master'
import { extractErrorMessage, salesApi } from '../../api/sales'
import SalesItemForm from '../../components/sales/SalesItemForm'
import ItemsTable from '../../components/shared/ItemsTable'
import QuickAddCustomerModal from '../../components/master/QuickAddCustomerModal'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import { formatCurrency3, today } from '../../lib/format'

const EMPTY_HEADER = {
  saleDate: today(),
  customerId: '',
  discount: '0',
}

export default function SalesEntryPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [invoiceNo, setInvoiceNo] = useState('Generating...')
  const [header, setHeader] = useState(EMPTY_HEADER)
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false)

  function loadCustomers() {
    return customersApi.list({ active: true }).then(setCustomers)
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    if (isEdit) {
      salesApi
        .get(id)
        .then((sale) => {
          setInvoiceNo(sale.invoice_no)
          setHeader({
            saleDate: sale.sale_date,
            customerId: String(sale.customer_id),
            discount: String(sale.discount ?? 0),
          })
          setItems(sale.items)
          setLoading(false)
        })
        .catch((err) => {
          setError(extractErrorMessage(err))
          setLoading(false)
        })
    } else {
      salesApi.nextInvoiceNumber(header.saleDate).then((res) => setInvoiceNo(res.number))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  useEffect(() => {
    if (!isEdit && header.saleDate) {
      salesApi.nextInvoiceNumber(header.saleDate).then((res) => {
        if (!isEdit) setInvoiceNo(res.number)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.saleDate])

  function openQuickCustomer() {
    setQuickCustomerOpen(true)
  }

  async function handleCustomerCreated(created) {
    await loadCustomers()
    handleCustomerChange(String(created.id))
    setQuickCustomerOpen(false)
  }

  const selectedCustomer = customers.find((c) => c.id === Number(header.customerId))
  const customerMargin = Number(selectedCustomer?.margin ?? 0)

  const taxableTotal = items.reduce((sum, i) => sum + i.taxable_amount, 0)
  const gstTotal = items.reduce((sum, i) => sum + i.gst_amount, 0)
  const itemsTotal = items.reduce((sum, i) => sum + i.grand_amount, 0)
  const discountValue = Number(header.discount) || 0
  const grandTotal = itemsTotal - discountValue

  function handleCustomerChange(value) {
    setHeader((h) => ({ ...h, customerId: value }))
    setItems([])
    setEditingIndex(null)
    setError(null)
  }

  function handleAddItem(item) {
    setItems((prev) => [...prev, item])
  }

  function handleUpdateItem(item) {
    setItems((prev) => prev.map((existing, i) => (i === editingIndex ? item : existing)))
    setEditingIndex(null)
  }

  function handleEditItem(index) {
    setEditingIndex(index)
  }

  function handleCancelEdit() {
    setEditingIndex(null)
  }

  function handleRemoveItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  function handleSave() {
    setError(null)
    if (!header.customerId) {
      setError('Please select a customer.')
      return
    }
    if (items.length === 0) {
      setError('Add at least one product before saving.')
      return
    }
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    try {
      const payload = {
        sale_date: header.saleDate,
        customer_id: Number(header.customerId),
        selling_price_type: selectedCustomer?.selling_price_type || 'Retail',
        state_of_supply: selectedCustomer?.state || null,
        shipping_name: selectedCustomer?.name || null,
        shipping_address_line1: selectedCustomer?.address_line1 || null,
        shipping_address_line2: selectedCustomer?.address_line2 || null,
        shipping_city: selectedCustomer?.city || null,
        shipping_state: selectedCustomer?.state || null,
        shipping_pincode: selectedCustomer?.pincode || null,
        discount: discountValue,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_detail_id: i.product_detail_id,
          quantity: i.quantity,
          free_quantity: i.free_quantity,
          uom: i.uom,
          price: i.price,
          price_inc_gst: i.price_inc_gst || false,
          discount_percent: i.discount_percent || 0,
          gst_percent: i.gst_percent,
          is_igst: i.is_igst || false,
        })),
      }
      const saved = isEdit ? await salesApi.update(id, payload) : await salesApi.create(payload)
      setResultDialog({
        variant: 'success',
        title: isEdit ? 'Sale Updated Successfully' : 'Sale Saved Successfully',
        message: isEdit
          ? 'Your sales changes have been saved successfully.'
          : `Invoice ${saved.invoice_no || ''} has been saved successfully.`,
        onCloseNav: '/sales/view',
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: isEdit ? 'Failed to Update Sale' : 'Failed to Save Sale',
        message: extractErrorMessage(err),
      })
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader isEdit={isEdit} />
        <main className="px-6 py-6">
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        </main>
      </div>
    )
  }

  return (
    <div>
      <PageHeader isEdit={isEdit} />

      <main className="space-y-5 px-6 py-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <FieldLabel required>Sales Date</FieldLabel>
              <TextInput
                type="date"
                value={header.saleDate}
                onChange={(e) => setHeader({ ...header, saleDate: e.target.value })}
                disabled={isEdit}
                className={isEdit ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <FieldLabel required>Customer Name</FieldLabel>
                <button
                  type="button"
                  onClick={openQuickCustomer}
                  className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  <Plus size={12} /> Add Customer
                </button>
              </div>
              <Select
                value={header.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value="" disabled>
                  Select customer
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.gst_number ? ` (${c.gst_number})` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Invoice Number</FieldLabel>
              <TextInput value={invoiceNo} readOnly className="cursor-not-allowed bg-slate-50 text-slate-500" />
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>Shipping Address</FieldLabel>
            {selectedCustomer ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                {customerAddress(selectedCustomer) || (
                  <span className="text-slate-400">No address on file for this customer.</span>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                Select a customer to show their address.
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel>Grand Total</FieldLabel>
              <TextInput
                readOnly
                value={formatCurrency3(grandTotal)}
                className="cursor-not-allowed bg-slate-50 text-slate-500"
              />
            </div>
          </div>
        </div>

        <SalesItemForm
          key={header.customerId}
          customerMargin={customerMargin}
          excludeSaleId={isEdit ? id : undefined}
          onAdd={handleAddItem}
          editingItem={editingIndex != null ? items[editingIndex] : null}
          onUpdate={handleUpdateItem}
          onCancelEdit={handleCancelEdit}
        />

        <ItemsTable
          items={items}
          onRemove={handleRemoveItem}
          onEdit={handleEditItem}
          priceFieldName="price"
          emptyMessage="No products added yet. Use the form above to add sales items."
        />

        <div className="flex flex-col items-stretch gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Taxable Amount</p>
              <p className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">{formatCurrency3(taxableTotal)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">GST Amount</p>
              <p className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">{formatCurrency3(gstTotal)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Grand Total</p>
              <p className="mt-1 text-xl font-bold text-brand-600 tabular-nums">{formatCurrency3(grandTotal)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Sale'}
          </button>
        </div>
      </main>

      {quickCustomerOpen && (
        <QuickAddCustomerModal onClose={() => setQuickCustomerOpen(false)} onCreated={handleCustomerCreated} />
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={isEdit ? 'Save Sale Changes?' : 'Save Sale?'}
        message={`Are you sure you want to ${isEdit ? 'save the changes to this sale' : 'save this sale'}?`}
        confirmLabel="Save Sale"
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
          setResultDialog(null)
          if (resultDialog?.onCloseNav && resultDialog.variant === 'success') {
            navigate(resultDialog.onCloseNav)
          }
        }}
      />
    </div>
  )
}

function PageHeader({ isEdit }) {
  return (
    <div className="mb-6 flex items-center gap-3 px-6 pt-6">
      <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">
        {isEdit ? 'EDIT SALE' : 'SALES ENTRY'}
      </h1>
    </div>
  )
}

function customerAddress(customer) {
  return [customer.address_line1, customer.address_line2, customer.city, customer.state, customer.pincode]
    .filter(Boolean)
    .join(', ')
}
