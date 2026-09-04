import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { customersApi } from '../../api/master'
import { extractErrorMessage, salesApi } from '../../api/sales'
import SalesItemForm from '../../components/sales/SalesItemForm'
import SalesItemsTable from '../../components/sales/SalesItemsTable'
import QuickAddCustomerModal from '../../components/master/QuickAddCustomerModal'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import { formatCurrency3 } from '../../lib/format'

function today() {
  return new Date().toISOString().slice(0, 10)
}

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

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false)

  function loadCustomers() {
    return customersApi.list({ active: true }).then(setCustomers)
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    if (isEdit) {
      salesApi.get(id).then((sale) => {
        setInvoiceNo(sale.invoice_no)
        setHeader({
          saleDate: sale.sale_date,
          customerId: String(sale.customer_id),
          discount: String(sale.discount ?? 0),
        })
        setItems(sale.items)
        setLoading(false)
      })
    } else {
      salesApi.nextInvoiceNumber().then((res) => setInvoiceNo(res.number))
    }
  }, [id, isEdit])

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
    setError(null)
  }

  function handleAddItem(item) {
    setItems((prev) => [...prev, item])
  }

  function handleRemoveItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setError(null)
    if (!header.customerId) {
      setError('Please select a customer.')
      return
    }
    if (items.length === 0) {
      setError('Add at least one product before saving.')
      return
    }

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
      if (isEdit) {
        await salesApi.update(id, payload)
      } else {
        await salesApi.create(payload)
      }
      navigate('/sales/view')
    } catch (err) {
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

        <SalesItemForm key={header.customerId} customerMargin={customerMargin} onAdd={handleAddItem} />

        <SalesItemsTable items={items} onRemove={handleRemoveItem} />

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
    </div>
  )
}

function PageHeader({ isEdit }) {
  return (
    <header className="border-b border-brand-200 bg-brand-100">
      <div className="px-6 py-5">
        <h1 className="text-lg font-semibold text-slate-800">{isEdit ? 'Edit Sale' : 'Sales Entry'}</h1>
        <p className="text-sm text-slate-400">
          {isEdit ? 'Update this sales invoice' : 'Record a new sales invoice for a customer'}
        </p>
      </div>
    </header>
  )
}

function customerAddress(customer) {
  return [customer.address_line1, customer.address_line2, customer.city, customer.state, customer.pincode]
    .filter(Boolean)
    .join(', ')
}
