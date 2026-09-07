import { useEffect, useMemo, useState } from 'react'
import {useNavigate, useParams, Link} from 'react-router-dom'
import {Plus, Trash2} from 'lucide-react'
import { categoriesApi, customersApi, productsApi } from '../../api/master'
import { extractErrorMessage, salesOrdersApi } from '../../api/sales'
import { FieldLabel, FormRow, Select, TextInput } from '../../components/master/FormField'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { SALES_TYPES } from '../../lib/constants'
import { today } from '../../lib/format'

export default function SalesOrderEntryPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [orderNo, setOrderNo] = useState('Generating...')
  const [orderDate, setOrderDate] = useState(today())
  const [customerId, setCustomerId] = useState('')
  const [salesType, setSalesType] = useState('Cash')
  const [customers, setCustomers] = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [items, setItems] = useState([])

  const [categoryFilter, setCategoryFilter] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [itemError, setItemError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  useEffect(() => {
    customersApi.list({ active: true }).then(setCustomers)
    categoriesApi.list({ active: true }).then(setCategories)
    productsApi.list({ active: true }).then(setProducts)
  }, [])

  useEffect(() => {
    if (isEdit) {
      salesOrdersApi.get(id).then((order) => {
        setOrderNo(order.order_no)
        setOrderDate(order.order_date)
        setCustomerId(String(order.customer_id))
        setSalesType(order.sales_type || 'Cash')
        setItems(order.items)
        setLoading(false)
      })
    } else {
      salesOrdersApi.nextOrderNumber().then((res) => setOrderNo(res.number))
    }
  }, [id, isEdit])

  const filteredProducts = useMemo(
    () => (categoryFilter ? products.filter((p) => p.category_id === Number(categoryFilter)) : products),
    [products, categoryFilter],
  )

  function handleAddItem() {
    const errors = []
    if (!productId) errors.push('Select a product.')
    if (!(Number(quantity) > 0)) errors.push('Enter a quantity greater than 0.')
    if (errors.length > 0) {
      setItemError(errors.join(' '))
      return
    }
    setItemError(null)

    const product = products.find((p) => p.id === Number(productId))
    setItems((prev) => [
      ...prev,
      { product_id: Number(productId), product_name: product?.name, quantity: Number(quantity) },
    ])
    setProductId('')
    setQuantity('1')
  }

  function handleRemoveItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    setError(null)
    if (!customerId) {
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
        order_date: orderDate,
        customer_id: Number(customerId),
        sales_type: salesType,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      }
      if (isEdit) {
        await salesOrdersApi.update(id, payload)
      } else {
        await salesOrdersApi.create(payload)
      }
      setResultDialog({
        variant: 'success',
        title: isEdit ? 'Sales Order Updated Successfully' : 'Sales Order Saved Successfully',
        message: isEdit
          ? 'Your sales order changes have been saved successfully.'
          : `Sales order ${orderNo || ''} has been saved successfully.`,
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
          <FormRow cols={2}>
            <div>
              <FieldLabel>Order Number</FieldLabel>
              <TextInput value={orderNo} readOnly className="cursor-not-allowed bg-slate-50 text-slate-500" />
            </div>
            <div>
              <FieldLabel required>Sales Date</FieldLabel>
              <TextInput
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                disabled={isEdit}
                className={isEdit ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}
              />
            </div>
          </FormRow>
          <div className="mt-4">
            <FormRow cols={2}>
              <div>
                <FieldLabel required>Customer Name</FieldLabel>
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="" disabled>
                    Select customer
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel required>Sales Type</FieldLabel>
                <Select value={salesType} onChange={(e) => setSalesType(e.target.value)}>
                  {SALES_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
            </FormRow>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <h3 className="text-sm font-semibold text-slate-700">Add Product</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel required>Product Name</FieldLabel>
              <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="" disabled>
                  Select product
                </option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel required>Item Quantity</FieldLabel>
              <TextInput type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                <Plus size={16} strokeWidth={2.5} />
                Add Item
              </button>
            </div>
          </div>
          {itemError && <p className="mt-2 text-xs text-rose-500">{itemError}</p>}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#103252] text-xs uppercase tracking-wide text-white">
                <th className="px-5 py-3 font-medium">SL#</th>
                <th className="px-5 py-3 font-medium">Product Name</th>
                <th className="px-5 py-3 text-right font-medium">Quantity</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                    No products added yet.
                  </td>
                </tr>
              )}
              {items.map((item, index) => (
                <tr key={index} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-slate-400">{index + 1}</td>
                  <td className="px-5 py-3.5 font-medium">{item.product_name}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      aria-label={`Remove ${item.product_name}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="flex justify-end">
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
        message={`Are you sure you want to ${isEdit ? 'save the changes to this sales order' : 'save this sales order'}?`}
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
