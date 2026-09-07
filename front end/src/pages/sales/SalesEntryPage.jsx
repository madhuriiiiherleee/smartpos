import { useEffect, useState } from 'react'
import {Plus, FileText, ShoppingCart, List, Calculator} from 'lucide-react'
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
        <main className="px-6 py-6">
          <PageHeader isEdit={isEdit} />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        </main>
      </div>
    )
  }

  return (
    <div>
      <main className="space-y-6 px-6 py-6 max-w-7xl mx-auto">
        <PageHeader isEdit={isEdit} />
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {/* Section 1: Invoice Details */}
        <section>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <FileText size={16} className="text-brand-500" /> Invoice Details
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <TextInput value={invoiceNo} readOnly className="cursor-not-allowed bg-slate-50 text-slate-500 font-medium" />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Add Products */}
        <section>
          <div className="mb-3 mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <ShoppingCart size={16} className="text-brand-500" /> Add Products
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
        </section>

        {/* Section 3: Added Items Table */}
        <section>
          <div className="mb-3 mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <List size={16} className="text-brand-500" /> Added Items
          </div>
          <ItemsTable
            items={items}
            onRemove={handleRemoveItem}
            onEdit={handleEditItem}
            priceFieldName="price"
            emptyMessage="No products added yet. Use the form above to add sales items."
          />
        </section>

        {/* Section 4: Summary & Save */}
        <section className="flex justify-end mt-8">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Calculator size={16} className="text-brand-500" /> Summary
            </div>
            
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span className="font-medium text-slate-800 tabular-nums">{formatCurrency3(taxableTotal)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span>Total GST:</span>
                <span className="font-medium text-slate-800 tabular-nums">{formatCurrency3(gstTotal)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-base font-bold text-slate-800">Grand Total:</span>
                <span className="text-xl font-bold text-brand-600 tabular-nums">{formatCurrency3(grandTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Sale'}
            </button>
          </div>
        </section>
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
    <div className="mb-6 flex items-center gap-3">
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
