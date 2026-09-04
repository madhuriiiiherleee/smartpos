import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { vendorsApi } from '../../api/master'
import { extractErrorMessage, purchasesApi } from '../../api/purchase'
import PurchaseItemForm from '../../components/purchase/PurchaseItemForm'
import PurchaseItemsTable from '../../components/purchase/PurchaseItemsTable'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import { formatCurrency3 } from '../../lib/format'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function PurchaseEntryPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(today())
  const [roundOff, setRoundOff] = useState('0')
  const [items, setItems] = useState([])

  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [supplierError, setSupplierError] = useState(null)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    vendorsApi.list({ active: true }).then((list) => {
      setSuppliers(list)
      if (list.length === 0) {
        setSupplierError('No vendors found. Add one in Master Settings → Vendor.')
      } else if (!isEdit) {
        setSupplierId(String(list[0].id))
      }
    })
  }, [isEdit])

  useEffect(() => {
    if (isEdit) {
      purchasesApi.get(id).then((purchase) => {
        setInvoiceNo(purchase.invoice_no)
        setInvoiceDate(purchase.purchase_date)
        setRoundOff(String(purchase.round_off ?? 0))
        setItems(purchase.items)
        setSupplierId(purchase.supplier_id ? String(purchase.supplier_id) : '')
        setLoading(false)
      })
    }
  }, [id, isEdit])

  const taxableTotal = items.reduce((sum, i) => sum + i.taxable_amount, 0)
  const gstTotal = items.reduce((sum, i) => sum + i.gst_amount, 0)
  const itemsTotal = items.reduce((sum, i) => sum + i.grand_amount, 0)
  const roundOffValue = Number(roundOff) || 0
  const grandTotal = itemsTotal + roundOffValue

  function handleAddItem(item) {
    setItems((prev) => [...prev, item])
  }

  function handleRemoveItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setError(null)
    if (!invoiceNo.trim()) {
      setError("Please enter the vendor's invoice number.")
      return
    }
    if (!supplierId) {
      setError(supplierError || 'Please select a vendor.')
      return
    }
    if (items.length === 0) {
      setError('Add at least one product before saving.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        invoice_no: invoiceNo.trim(),
        invoice_date: invoiceDate,
        supplier_id: Number(supplierId),
        round_off: roundOffValue,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_detail_id: i.product_detail_id,
          quantity: i.quantity,
          purchase_price: i.purchase_price,
          price_inc_gst: i.price_inc_gst || false,
          discount_percent: i.discount_percent || 0,
          gst_percent: i.gst_percent,
          is_igst: i.is_igst || false,
        })),
      }
      if (isEdit) {
        await purchasesApi.update(id, payload)
      } else {
        await purchasesApi.create(payload)
      }
      navigate('/purchase/manage')
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
        {(error || supplierError) && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error || supplierError}
          </div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <FieldLabel required>Vendor Invoice Number</FieldLabel>
              <TextInput
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="As printed on the vendor's invoice"
              />
            </div>
            <div>
              <FieldLabel required>Invoice Date</FieldLabel>
              <TextInput type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel required>Vendor Name</FieldLabel>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} disabled={suppliers.length === 0}>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <PurchaseItemForm onAdd={handleAddItem} />

        <PurchaseItemsTable items={items} onRemove={handleRemoveItem} />

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
            {saving ? 'Saving...' : 'Save Purchase'}
          </button>
        </div>
      </main>
    </div>
  )
}

function PageHeader({ isEdit }) {
  return (
    <header className="border-b border-brand-200 bg-brand-100">
      <div className="flex items-center gap-3 px-6 py-5">
        <Link
          to="/purchase/manage"
          aria-label="Back to Manage Purchase"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-brand-600"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{isEdit ? 'Edit Purchase' : 'Purchase Entry'}</h1>
          <p className="text-sm text-slate-400">
            {isEdit ? 'Update this purchase invoice' : 'Record a new purchase invoice from a vendor'}
          </p>
        </div>
      </div>
    </header>
  )
}
