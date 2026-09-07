import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { categoriesApi, packingSizesApi, productDetailsApi, productsApi } from '../../api/master'
import { FieldLabel, Select, TextInput } from '../master/FormField'
import QuickAddProductModal from '../master/QuickAddProductModal'
import SearchableSelect from '../master/SearchableSelect'
import { formatCurrency3 } from '../../lib/format'
import { GST_SLABS } from '../../lib/constants'

const BASE_EMPTY = {
  barcode: '',
  category_id: '',
  product_id: '',
  product_detail_id: '',
  boxes: '0',
  looseUnits: '0',
  uom: 'UNIT',
  price_inc_gst: true,
  discount_percent: '0',
  gst_percent: '5',
  is_igst: false,
}

export default function ItemForm({
  onAdd,
  priceFieldName = 'price',
  priceLabel = 'Price / Piece',
  priceErrorMsg = 'Enter a valid Price / Piece.',
  barcodePlaceholder = 'Scan or type SKU',
  barcodeNotFoundMsg = 'No product found for that barcode/SKU.',
  detailGridCols = 'xl:grid-cols-8',
  customerMargin = null,
  availableQtyFn = null,
  autoFillPriceOnDetailChange = false,
  enableIgst = false,
  preserveOnReset = [],
  editingItem = null,
  onUpdate = null,
  onCancelEdit = null,
}) {
  const [categories, setCategories] = useState([])
  const [packingSizes, setPackingSizes] = useState([])
  const [products, setProducts] = useState([])
  const [productDetails, setProductDetails] = useState([])
  const [availableQty, setAvailableQty] = useState(null)
  const [barcodeError, setBarcodeError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [form, setForm] = useState(() => ({ ...BASE_EMPTY, [priceFieldName]: '' }))
  const lastLookedUpBarcodeRef = useRef('')
  const formRef = useRef(form)
  formRef.current = form
  const suppressPriceForDetailRef = useRef(null)
  const isEditing = editingItem != null

  useEffect(() => {
    if (formError) setFormError(null)
  }, [form])

  useEffect(() => {
    if (!editingItem) return
    suppressPriceForDetailRef.current =
      editingItem.product_detail_id != null ? String(editingItem.product_detail_id) : null
    setBarcodeError(null)
    setFormError(null)
    const productBeingEdited = products.find((p) => p.id === editingItem.product_id)
    setForm({
      barcode: '',
      category_id: productBeingEdited ? String(productBeingEdited.category_id) : '',
      product_id: String(editingItem.product_id),
      product_detail_id: editingItem.product_detail_id != null ? String(editingItem.product_detail_id) : '',
      boxes: '0',
      looseUnits: String(editingItem.quantity ?? 0),
      uom: editingItem.uom || 'UNIT',
      price_inc_gst: editingItem.price_inc_gst ?? true,
      discount_percent: String(editingItem.discount_percent ?? 0),
      gst_percent: String(editingItem.gst_percent ?? 5),
      is_igst: editingItem.is_igst ?? false,
      [priceFieldName]: String(editingItem[priceFieldName] ?? ''),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem])

  // If the products list wasn't loaded when the edit form prefilled, fill the
  // category from the edited product once it arrives (never override a value
  // the user has actively picked).
  useEffect(() => {
    if (!editingItem || form.category_id) return
    const product = products.find((p) => p.id === editingItem.product_id)
    if (!product) return
    setForm((f) => (f.category_id ? f : { ...f, category_id: String(product.category_id) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, editingItem])

  // When editing, split the saved total quantity back into boxes/loose
  // pieces using the selected pack's qty-per-box (prefill above dumps the
  // whole quantity into loose units otherwise).
  useEffect(() => {
    if (!editingItem) return
    const detail = productDetails.find((d) => d.id === Number(form.product_detail_id))
    if (!detail) return
    const qpb = detail.qty_per_box || 1
    const qty = editingItem.quantity ?? 0
    const boxes = Math.floor(qty / qpb)
    const loose = qty % qpb
    setForm((f) => {
      if (f.boxes === String(boxes) && f.looseUnits === String(loose)) return f
      return { ...f, boxes: String(boxes), looseUnits: String(loose) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetails, form.product_detail_id, editingItem])

  const [quickAddOpen, setQuickAddOpen] = useState(false)

  function loadProducts() {
    return productsApi.list({ active: true }).then(setProducts)
  }

  useEffect(() => {
    categoriesApi.list({ active: true }).then(setCategories)
    packingSizesApi.list({ active: true }).then(setPackingSizes)
    loadProducts()
  }, [])

  async function handleProductCreated(created) {
    await loadProducts()
    setForm((f) => ({ ...f, category_id: String(created.category_id), product_id: String(created.id) }))
    setQuickAddOpen(false)
  }

  useEffect(() => {
    if (!form.product_id) {
      setProductDetails([])
      return
    }
    productDetailsApi.list({ product_id: form.product_id }).then((details) => {
      setProductDetails(details)
      setForm((f) => {
        const stillValid = details.some((d) => String(d.id) === f.product_detail_id)
        if (stillValid) return f
        const first = details[0]
        if (!first) return { ...f, product_detail_id: '' }
        if (autoFillPriceOnDetailChange) {
          return {
            ...f,
            product_detail_id: String(first.id),
            [priceFieldName]: String(first.rate_per_unit / first.qty_per_box),
          }
        }
        return { ...f, product_detail_id: String(first.id) }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_id])

  // Optional auto-pricing: Selling Price = (MRP / Qty per Box) - Margin (sales)
  useEffect(() => {
    if (customerMargin == null) return
    const detail = productDetails.find((d) => d.id === Number(form.product_detail_id))
    if (!detail) return
    if (suppressPriceForDetailRef.current === String(detail.id)) {
      suppressPriceForDetailRef.current = null
      return
    }
    const margin = Number(customerMargin) || 0
    const mrpPerPiece = detail.mrp / (detail.qty_per_box || 1)
    const sellingPrice = mrpPerPiece * (1 - margin / 100)
    setForm((f) => ({ ...f, [priceFieldName]: sellingPrice.toFixed(2) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_detail_id, productDetails, customerMargin])

  // Optional live stock check (sales)
  useEffect(() => {
    if (!availableQtyFn) {
      setAvailableQty(null)
      return
    }
    if (!form.product_detail_id) {
      setAvailableQty(null)
      return
    }
    availableQtyFn(form.product_detail_id).then(setAvailableQty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_detail_id])

  useEffect(() => {
    const trimmed = form.barcode.trim()
    if (!trimmed) {
      lastLookedUpBarcodeRef.current = ''
      return
    }
    if (trimmed === lastLookedUpBarcodeRef.current) return
    const timeoutId = setTimeout(() => {
      const currentBarcode = formRef.current.barcode.trim()
      if (!currentBarcode || currentBarcode === lastLookedUpBarcodeRef.current) return
      handleBarcodeLookup(formRef.current)
    }, 250)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.barcode])

  const filteredProducts = useMemo(() => {
    if (!form.category_id) return products
    let filtered = products.filter((p) => p.category_id === Number(form.category_id))
    const current = products.find((p) => p.id === Number(form.product_id))
    if (current && !filtered.some((p) => p.id === current.id)) filtered = [current, ...filtered]
    return filtered
  }, [products, form.category_id, form.product_id])

  const selectedDetail = productDetails.find((d) => d.id === Number(form.product_detail_id))
  const qtyPerBox = selectedDetail?.qty_per_box || 1

  const boxes = Number(form.boxes) || 0
  const looseUnits = Number(form.looseUnits) || 0
  const quantity = boxes * qtyPerBox + looseUnits
  const price = Number(form[priceFieldName]) || 0
  const discountPercent = Number(form.discount_percent) || 0
  const gstPercent = Number(form.gst_percent) || 0
  const isIgst = enableIgst && form.is_igst

  const gross = quantity * price
  const net = gross * (1 - discountPercent / 100)
  const taxableAmount = form.price_inc_gst ? net / (1 + gstPercent / 100) : net
  const gstAmount = (taxableAmount * gstPercent) / 100
  const grandAmount = taxableAmount + gstAmount
  const cgstAmount = isIgst ? 0 : gstAmount / 2
  const sgstAmount = isIgst ? 0 : gstAmount / 2
  const igstAmount = isIgst ? gstAmount : 0

  const insufficientStock = availableQty !== null && quantity > availableQty

  function handleCategoryChange(value) {
    setForm({ ...BASE_EMPTY, [priceFieldName]: '', category_id: value, gst_percent: form.gst_percent })
  }

  function handleProductChange(value) {
    setForm((f) => ({ ...f, product_id: value, product_detail_id: '' }))
  }

  function handleDetailChange(value) {
    const detail = productDetails.find((d) => d.id === Number(value))
    setForm((f) => ({
      ...f,
      product_detail_id: value,
      ...(autoFillPriceOnDetailChange && detail
        ? { [priceFieldName]: String(detail.rate_per_unit / detail.qty_per_box) }
        : {}),
    }))
  }

  async function handleBarcodeLookup(currentForm = form) {
    const trimmed = currentForm.barcode.trim()
    if (!trimmed) return
    lastLookedUpBarcodeRef.current = trimmed
    setBarcodeError(null)
    const matches = await productDetailsApi.list({ q: trimmed })
    const exact = matches.find((m) => m.code.toLowerCase() === trimmed.toLowerCase())
    const match = exact || matches[0]
    if (!match) {
      setBarcodeError(barcodeNotFoundMsg)
      return
    }
    const product = products.find((p) => p.id === match.product_id)
    const gstTotal =
      product && product.cgst_percent != null && product.sgst_percent != null
        ? String(Number(product.cgst_percent) + Number(product.sgst_percent))
        : null
    const pricePatch = autoFillPriceOnDetailChange
      ? { [priceFieldName]: String(match.rate_per_unit / match.qty_per_box) }
      : {}
    setForm((f) => ({
      ...f,
      category_id: product ? String(product.category_id) : f.category_id,
      product_id: String(match.product_id),
      product_detail_id: String(match.id),
      ...pricePatch,
      gst_percent: gstTotal ?? f.gst_percent,
    }))
  }

  function handleAdd() {
    const errors = []
    if (!form.product_id) errors.push('Select a product.')
    if (quantity <= 0) errors.push('Enter Boxes or Loose Pieces — total quantity must be greater than 0.')
    if (form[priceFieldName] === '' || price < 0) errors.push(priceErrorMsg)
    if (errors.length > 0 || insufficientStock) {
      setFormError(errors.length > 0 ? errors.join(' ') : null)
      return
    }
    setFormError(null)

    const product = products.find((p) => p.id === Number(form.product_id))
    const detail = productDetails.find((d) => d.id === Number(form.product_detail_id))
    const payload = {
      product_id: Number(form.product_id),
      product_detail_id: form.product_detail_id ? Number(form.product_detail_id) : null,
      product_code: product?.code,
      product_name: product?.name,
      code: detail?.code,
      quantity,
      free_quantity: 0,
      uom: form.uom,
      [priceFieldName]: price,
      price_inc_gst: form.price_inc_gst,
      discount_percent: discountPercent,
      gst_percent: gstPercent,
      is_igst: isIgst,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      taxable_amount: taxableAmount,
      gst_amount: gstAmount,
      grand_amount: grandAmount,
    }
    if (isEditing) {
      onUpdate?.(payload)
    } else {
      onAdd(payload)
    }
    setForm((f) => {
      const next = { ...BASE_EMPTY, [priceFieldName]: '', category_id: f.category_id }
      preserveOnReset.forEach((key) => {
        next[key] = f[key]
      })
      return next
    })
  }

  function handleCancelEdit() {
    setFormError(null)
    setBarcodeError(null)
    setForm({ ...BASE_EMPTY, [priceFieldName]: '' })
    onCancelEdit?.()
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{isEditing ? 'Edit Product' : 'Add Product'}</h3>
        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
        >
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <div>
          <FieldLabel>Pack Code</FieldLabel>
          <TextInput
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleBarcodeLookup()
              }
            }}
            placeholder={barcodePlaceholder}
          />
        </div>
        <div>
          <FieldLabel>Category</FieldLabel>
          <Select value={form.category_id} onChange={(e) => handleCategoryChange(e.target.value)}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel required>Product</FieldLabel>
          <SearchableSelect
            value={form.product_id}
            onChange={handleProductChange}
            options={filteredProducts.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select product"
          />
        </div>
      </div>

      {barcodeError && <p className="mt-2 text-xs text-rose-500">{barcodeError}</p>}

      <div className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${detailGridCols}`}>
        {productDetails.length > 0 && (
          <div>
            <FieldLabel>Pack Code</FieldLabel>
            <Select value={form.product_detail_id} onChange={(e) => handleDetailChange(e.target.value)}>
              {productDetails.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} ({d.packing_size})
                </option>
              ))}
            </Select>
          </div>
        )}

        {availableQtyFn && (
          <div>
            <FieldLabel>Available Qty</FieldLabel>
            <div className="flex h-[38px] items-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm text-slate-500 tabular-nums">
              {availableQty === null ? '—' : `${availableQty} pieces`}
            </div>
          </div>
        )}

        <div>
          <FieldLabel>Boxes {qtyPerBox > 1 && <span className="font-normal text-slate-400">(× {qtyPerBox})</span>}</FieldLabel>
          <TextInput
            type="number"
            min="0"
            step="1"
            value={form.boxes}
            onFocus={(e) => {
              if (e.target.value === '0') setForm((f) => ({ ...f, boxes: '' }))
            }}
            onBlur={() => {
              if (form.boxes === '') setForm((f) => ({ ...f, boxes: '0' }))
            }}
            onChange={(e) => setForm({ ...form, boxes: e.target.value.replace(/[^\d]/g, '') })}
          />
        </div>

        <div>
          <FieldLabel>Loose Pieces</FieldLabel>
          <TextInput
            type="number"
            min="0"
            value={form.looseUnits}
            onFocus={(e) => {
              if (e.target.value === '0') setForm((f) => ({ ...f, looseUnits: '' }))
            }}
            onBlur={() => {
              if (form.looseUnits === '') setForm((f) => ({ ...f, looseUnits: '0' }))
            }}
            onChange={(e) => setForm({ ...form, looseUnits: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel>Total Qty (pieces)</FieldLabel>
          <div
            className={`flex h-[38px] items-center rounded-lg border px-3 text-sm tabular-nums ${
              insufficientStock ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-700'
            }`}
          >
            {quantity}
          </div>
        </div>

        <div>
          <FieldLabel required>
            <span className="whitespace-nowrap">{priceLabel}</span>
          </FieldLabel>
          <TextInput
            type="number"
            min="0"
            step="0.01"
            value={form[priceFieldName]}
            onChange={(e) => setForm({ ...form, [priceFieldName]: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel>&nbsp;</FieldLabel>
          <label className="flex h-[38px] items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.price_inc_gst}
              onChange={(e) => setForm({ ...form, price_inc_gst: e.target.checked })}
              className="h-4 w-4 accent-brand-600"
            />
            Price inc GST
          </label>
        </div>

        <div>
          <FieldLabel required>GST %</FieldLabel>
          <Select value={form.gst_percent} onChange={(e) => setForm({ ...form, gst_percent: e.target.value })}>
            {GST_SLABS.map((slab) => (
              <option key={slab} value={slab}>
                {slab}%
              </option>
            ))}
          </Select>
        </div>
      </div>

      {insufficientStock && (
        <p className="mt-2 text-xs text-rose-500">
          Insufficient stock: requesting {quantity} pieces, only {availableQty} available.
        </p>
      )}

      {formError && <p className="mt-2 text-xs text-rose-500">{formError}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap gap-6 text-sm">
          {discountPercent > 0 && (
            <div>
              <span className="text-slate-400">Discount ({discountPercent}%) </span>
              <span className="font-medium text-slate-700 tabular-nums">- {formatCurrency3(gross - net)}</span>
            </div>
          )}
          <div>
            <span className="text-slate-400">Taxable Amount </span>
            <span className="font-medium text-slate-700 tabular-nums">{formatCurrency3(taxableAmount)}</span>
          </div>
          <div>
            <span className="text-slate-400">{isIgst ? 'IGST ' : 'CGST + SGST '}</span>
            <span className="font-medium text-slate-700 tabular-nums">{formatCurrency3(gstAmount)}</span>
          </div>
          <div>
            <span className="text-slate-400">Grand Amount </span>
            <span className="font-semibold text-slate-800 tabular-nums">{formatCurrency3(grandAmount)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus size={16} strokeWidth={2.5} />
            {isEditing ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>

      {quickAddOpen && (
        <QuickAddProductModal
          categories={categories}
          packingSizes={packingSizes}
          defaultCategoryId={form.category_id || categories[0]?.id || ''}
          onClose={() => setQuickAddOpen(false)}
          onCreated={handleProductCreated}
        />
      )}
    </div>
  )
}
