import { useEffect, useState } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'
import { vendorsApi } from '../../api/master'
import { extractErrorMessage, purchasesApi } from '../../api/purchase'
import PurchaseItemForm from '../../components/purchase/PurchaseItemForm'
import ItemsTable from '../../components/shared/ItemsTable'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import { formatCurrency3, formatDDMMYYYY, today } from '../../lib/format'

export default function PurchaseEntryPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(today())
  const [roundOff, setRoundOff] = useState('0')
  const [items, setItems] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)

  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [supplierError, setSupplierError] = useState(null)
  const [duplicatePurchase, setDuplicatePurchase] = useState(null)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

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
      purchasesApi
        .get(id)
        .then((purchase) => {
          setInvoiceNo(purchase.invoice_no)
          setInvoiceDate(purchase.purchase_date)
          setRoundOff(String(purchase.round_off ?? 0))
          setItems(purchase.items)
          setSupplierId(purchase.supplier_id ? String(purchase.supplier_id) : '')
          setLoading(false)
        })
        .catch((err) => {
          setError(extractErrorMessage(err))
          setLoading(false)
        })
    }
  }, [id, isEdit])

  useEffect(() => {
    const trimmed = invoiceNo.trim()
    if (!trimmed || !supplierId) {
      setDuplicatePurchase(null)
      return
    }
    const timeoutId = setTimeout(() => {
      purchasesApi
        .list({ supplier_id: supplierId, invoice_no: trimmed, page_size: 1 })
        .then((res) => {
          const found = res.items?.[0]
          // Ignore a match against the purchase currently being edited.
          if (found && String(found.id) !== String(id)) {
            setDuplicatePurchase(found)
          } else {
            setDuplicatePurchase(null)
          }
        })
        .catch(() => setDuplicatePurchase(null))
    }, 400)
    return () => clearTimeout(timeoutId)
  }, [invoiceNo, supplierId, id])

  const taxableTotal = items.reduce((sum, i) => sum + i.taxable_amount, 0)
  const gstTotal = items.reduce((sum, i) => sum + i.gst_amount, 0)
  const itemsTotal = items.reduce((sum, i) => sum + i.grand_amount, 0)
  const roundOffValue = Number(roundOff) || 0
  const grandTotal = itemsTotal + roundOffValue

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
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
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
      const saved = isEdit ? await purchasesApi.update(id, payload) : await purchasesApi.create(payload)
      setResultDialog({
        variant: 'success',
        title: isEdit ? 'Purchase Updated Successfully' : 'Purchase Saved Successfully',
        message: isEdit
          ? 'Your purchase changes have been saved successfully.'
          : `Invoice ${saved.invoice_no || ''} has been saved successfully.`,
        onCloseNav: '/purchase/manage',
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: isEdit ? 'Failed to Update Purchase' : 'Failed to Save Purchase',
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
      <main className="space-y-5 px-6 py-6">
        <PageHeader isEdit={isEdit} />
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
              {duplicatePurchase && (
                <p className="mt-1.5 text-xs text-amber-600">
                  Already entered: invoice {duplicatePurchase.invoice_no} dated{' '}
                  {formatDDMMYYYY(duplicatePurchase.purchase_date)}, ₹
                  {Number(duplicatePurchase.amount).toLocaleString('en-IN')} —{' '}
                  <Link to={`/purchase/entry/${duplicatePurchase.id}`} className="font-medium underline">
                    open it
                  </Link>{' '}
                  instead of re-entering.
                </p>
              )}
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

        <PurchaseItemForm
          onAdd={handleAddItem}
          editingItem={editingIndex != null ? items[editingIndex] : null}
          onUpdate={handleUpdateItem}
          onCancelEdit={handleCancelEdit}
        />

        <ItemsTable
          items={items}
          onRemove={handleRemoveItem}
          onEdit={handleEditItem}
          priceFieldName="purchase_price"
          emptyMessage="No products added yet. Use the form above to add purchase items."
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
            {isEdit ? (saving ? 'Updating...' : 'Update Purchase') : saving ? 'Adding...' : 'Add Purchase'}
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title={isEdit ? 'Save Purchase Changes?' : 'Save Purchase?'}
        message={`Are you sure you want to ${isEdit ? 'save the changes to this purchase' : 'save this purchase'}?`}
        confirmLabel={isEdit ? 'Update' : 'Add'}
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
        {isEdit ? 'EDIT PURCHASE' : 'PURCHASE ENTRY'}
      </h1>
    </div>
  )
}
