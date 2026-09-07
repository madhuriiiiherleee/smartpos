import { useEffect, useState } from 'react'
import {Plus} from 'lucide-react'
import {useNavigate, useParams, Link} from 'react-router-dom'
import { customersApi, productsApi } from '../../api/master'
import { extractErrorMessage, salesOrdersApi } from '../../api/sales'
import SalesItemForm from '../../components/sales/SalesItemForm'
import ItemsTable from '../../components/shared/ItemsTable'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import { formatCurrency3, today } from '../../lib/format'

const EMPTY_HEADER = {
  orderDate: today(),
  customerId: '',
  salesType: 'Cash',
  discount: '0',
}

export default function SalesOrderEntryPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [orderNo, setOrderNo] = useState('Generating...')
  const [header, setHeader] = useState(EMPTY_HEADER)
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  const selectedCustomer = customers.find((c) => c.id === Number(header.customerId))
  const customerMargin = selectedCustomer?.margin || 0

  useEffect(() => {
    customersApi.list({ active: true }).then(setCustomers)
  }, [])

  useEffect(() => {
    if (isEdit) {
      salesOrdersApi.get(id).then((order) => {
        setOrderNo(order.order_no)
        setHeader({
          orderDate: order.order_date,
          customerId: String(order.customer_id || ''),
          salesType: order.sales_type || 'Cash',
          discount: order.discount?.toString() || '0',
        })
        setItems(order.items)
        setLoading(false)
      }).catch((err) => {
        console.error(err)
        setLoading(false)
      })
    } else {
      salesOrdersApi.nextOrderNumber(header.orderDate).then((res) => {
        setOrderNo(res.next_number)
      })
    }
  }, [id, isEdit, header.orderDate])

  const taxableTotal = items.reduce((sum, item) => sum + (Number(item.taxable_amount) || 0), 0)
  const gstTotal = items.reduce((sum, item) => sum + (Number(item.gst_amount) || 0), 0)
  const discountValue = Number(header.discount) || 0
  const itemsGrandTotal = items.reduce((sum, item) => sum + (Number(item.grand_amount) || 0), 0)
  const grandTotal = itemsGrandTotal - discountValue

  function handleCustomerChange(customerId) {
    setHeader({ ...header, customerId })
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
        order_date: header.orderDate,
        customer_id: Number(header.customerId),
        sales_type: header.salesType,
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
          cgst_amount: i.cgst_amount || 0,
          sgst_amount: i.sgst_amount || 0,
          igst_amount: i.igst_amount || 0,
          taxable_amount: i.taxable_amount || 0,
          gst_amount: i.gst_amount || 0,
          grand_amount: i.grand_amount || 0,
        })),
      }
      
      const saved = isEdit ? await salesOrdersApi.update(id, payload) : await salesOrdersApi.create(payload)
      setResultDialog({
        variant: 'success',
        title: isEdit ? 'Sales Order Updated Successfully' : 'Sales Order Saved Successfully',
        message: isEdit
          ? 'Your sales order changes have been saved successfully.'
          : `Sales order ${saved.order_no || ''} has been saved successfully.`,
        onCloseNav: '/sales/order/view',
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: isEdit ? 'Failed to Update Sales Order' : 'Failed to Save Sales Order',
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
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel required>Order Date</FieldLabel>
              <TextInput
                type="date"
                value={header.orderDate}
                onChange={(e) => setHeader({ ...header, orderDate: e.target.value })}
                disabled={isEdit}
                className={isEdit ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}
              />
            </div>
            <div>
              <FieldLabel required>Customer Name</FieldLabel>
              <Select
                value={header.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value="" disabled>Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.gst_number ? `(${c.gst_number})` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Sales Type</FieldLabel>
              <Select
                value={header.salesType}
                onChange={(e) => setHeader({ ...header, salesType: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="Credit">Credit</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Order Number</FieldLabel>
              <TextInput value={orderNo} readOnly className="cursor-not-allowed bg-slate-50 text-slate-500" />
            </div>
          </div>
        </div>

        <SalesItemForm
          key={header.customerId}
          customerMargin={customerMargin}
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
          emptyMessage="No products added yet. Use the form above to add order items."
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
            {saving ? 'Saving...' : 'Save Sales Order'}
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title={isEdit ? 'Save Sales Order Changes?' : 'Save Sales Order?'}
        message={`Are you sure you want to ${isEdit ? 'save the changes to this order' : 'save this order'}?`}
        confirmLabel="Save Order"
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
        {isEdit ? 'EDIT SALES ORDER' : 'SALES ORDER ENTRY'}
      </h1>
    </div>
  )
}
