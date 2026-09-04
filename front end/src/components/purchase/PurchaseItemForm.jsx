import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { categoriesApi, packingSizesApi, productDetailsApi, productsApi } from '../../api/master'
import { FieldLabel, Select, TextInput } from '../master/FormField'
import QuickAddProductModal from '../master/QuickAddProductModal'
import SearchableSelect from '../master/SearchableSelect'
import { formatCurrency3 } from '../../lib/format'

const GST_SLABS = [0, 5, 12, 18, 28]

const EMPTY = {
  barcode: '',
  category_id: '',
  product_id: '',
  product_detail_id: '',
  boxes: '0',
  looseUnits: '0',
  purchase_price: '',
  price_inc_gst: true,
  discount_percent: '0',
  gst_percent: '5',
  is_igst: false,
}

export default function PurchaseItemForm({ onAdd }) {
  const [categories, setCategories] = useState([])
  const [packingSizes, setPackingSizes] = useState([])
  const [products, setProducts] = useState([])
  const [productDetails, setProductDetails] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [barcodeError, setBarcodeError] = useState(null)
  const [formError, setFormError] = useState(null)
  const lastLookedUpBarcodeRef = useRef('')

  useEffect(() => {
    if (formError) setFormError(null)
  }, [form])

  const [quickAddOpen, setQuickAddOpen] = useState(false)

  function loadProducts() {
    return productsApi.list({ active: true }).then(setProducts)
  }

  useEffect(() => {
    categoriesApi.list({ active: true }).then(setCategories)
    packingSizesApi.list({ active: true }).then(setPackingSizes)
    loadProducts()
  }, [])

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
        return {
          ...f,
          product_detail_id: first ? String(first.id) : '',
          purchase_price: first ? String(first.rate_per_unit / first.qty_per_box) : f.purchase_price,
        }
      })
    })
  }, [form.product_id])

  useEffect(() => {
    const trimmed = form.barcode.trim()
    if (!trimmed) {
      lastLookedUpBarcodeRef.current = ''
      return
    }
    if (trimmed === lastLookedUpBarcodeRef.current) return
    const timeoutId = setTimeout(() => {
      handleBarcodeLookup()
    }, 250)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.barcode])

  const filteredProducts = useMemo(
    () => (form.category_id ? products.filter((p) => p.category_id === Number(form.category_id)) : products),
    [products, form.category_id],
  )

  const selectedDetail = productDetails.find((d) => d.id === Number(form.product_detail_id))
  const qtyPerBox = selectedDetail?.qty_per_box || 1

  const boxes = Number(form.boxes) || 0
  const looseUnits = Number(form.looseUnits) || 0
  const quantity = boxes * qtyPerBox + looseUnits
  const price = Number(form.purchase_price) || 0
  const discountPercent = Number(form.discount_percent) || 0
  const gstPercent = Number(form.gst_percent) || 0

  const gross = quantity * price
  const net = gross * (1 - discountPercent / 100)
  const taxableAmount = form.price_inc_gst ? net / (1 + gstPercent / 100) : net
  const gstAmount = (taxableAmount * gstPercent) / 100
  const grandAmount = taxableAmount + gstAmount
  const cgstAmount = form.is_igst ? 0 : gstAmount / 2
  const sgstAmount = form.is_igst ? 0 : gstAmount / 2
  const igstAmount = form.is_igst ? gstAmount : 0


  function handleCategoryChange(value) {
    setForm({ ...EMPTY, category_id: value, gst_percent: form.gst_percent })
  }

  function handleProductChange(value) {
    setForm((f) => ({ ...f, product_id: value, product_detail_id: '' }))
  }

  async function handleBarcodeLookup() {
    const trimmed = form.barcode.trim()
    if (!trimmed) return
    lastLookedUpBarcodeRef.current = trimmed
    setBarcodeError(null)
    const matches = await productDetailsApi.list({ q: trimmed })
    const exact = matches.find((m) => m.code.toLowerCase() === trimmed.toLowerCase())
    const match = exact || matches[0]
    if (!match) {
      setBarcodeError('No product found for that barcode/code.')
      return
    }
    const product = products.find((p) => p.id === match.product_id)
    const gstTotal =
      product && product.cgst_percent != null && product.sgst_percent != null
        ? String(Number(product.cgst_percent) + Number(product.sgst_percent))
        : null
    setForm((f) => ({
      ...f,
      category_id: product ? String(product.category_id) : f.category_id,
      product_id: String(match.product_id),
      product_detail_id: String(match.id),
      purchase_price: String(match.rate_per_unit / match.qty_per_box),
      gst_percent: gstTotal ?? f.gst_percent,
    }))
  }

  function handleAdd() {
    const errors = []
    if (!form.product_id) errors.push('Select a product.')
    if (quantity <= 0) errors.push('Enter Boxes or Loose Pieces — total quantity must be greater than 0.')
    if (form.purchase_price === '' || price < 0) errors.push('Enter a valid Purchase Price / Piece.')
    if (errors.length > 0) {
      setFormError(errors.join(' '))
      return
    }
    setFormError(null)

    const product = products.find((p) => p.id === Number(form.product_id))
    const detail = productDetails.find((d) => d.id === Number(form.product_detail_id))
    onAdd({
      product_id: Number(form.product_id),
      product_detail_id: form.product_detail_id ? Number(form.product_detail_id) : null,
      product_code: product?.code,
      product_name: product?.name,
      code: detail?.code,
      quantity,
      purchase_price: price,
      price_inc_gst: form.price_inc_gst,
      discount_percent: discountPercent,
      gst_percent: gstPercent,
      is_igst: form.is_igst,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      taxable_amount: taxableAmount,
      gst_amount: gstAmount,
      grand_amount: grandAmount,
    })
    setForm({ ...EMPTY, category_id: form.category_id })
  }

  function openQuickAdd() {
    setQuickAddOpen(true)
  }

  async function handleProductCreated(created) {
    await loadProducts()
    setForm((f) => ({ ...f, category_id: String(created.category_id), product_id: String(created.id) }))
    setQuickAddOpen(false)
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Add Product</h3>
        <button
          type="button"
          onClick={openQuickAdd}
          className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
        >
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <div>
          <FieldLabel>Barcode</FieldLabel>
          <TextInput
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleBarcodeLookup()
              }
            }}
            placeholder="Scan or type code"
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

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8">
        {productDetails.length > 0 && (
          <div>
            <FieldLabel>Code / Packing</FieldLabel>
            <Select
              value={form.product_detail_id}
              onChange={(e) => {
                const detail = productDetails.find((d) => d.id === Number(e.target.value))
                setForm((f) => ({
                  ...f,
                  product_detail_id: e.target.value,
                  purchase_price: detail ? String(detail.rate_per_unit / detail.qty_per_box) : f.purchase_price,
                }))
              }}
            >
              {productDetails.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} ({d.packing_size})
                </option>
              ))}
            </Select>
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
          <div className="flex h-[38px] items-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm text-slate-700 tabular-nums">
            {quantity}
          </div>
        </div>

        <div>
          <FieldLabel required><span className="whitespace-nowrap">Purchase Price / Piece</span></FieldLabel>
          <TextInput
            type="number"
            min="0"
            step="0.01"
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
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
            <span className="text-slate-400">{form.is_igst ? 'IGST ' : 'CGST + SGST '}</span>
            <span className="font-medium text-slate-700 tabular-nums">{formatCurrency3(gstAmount)}</span>
          </div>
          <div>
            <span className="text-slate-400">Grand Amount </span>
            <span className="font-semibold text-slate-800 tabular-nums">{formatCurrency3(grandAmount)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Item
        </button>
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
