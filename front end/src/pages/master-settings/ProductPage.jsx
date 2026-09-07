import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { categoriesApi, extractErrorMessage, packingSizesApi, productDetailsApi, productsApi } from '../../api/master'
import AddProductForm from '../../components/master/AddProductForm'
import Modal from '../../components/master/Modal'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import PageToolbar from '../../components/master/PageToolbar'
import ToggleSwitch from '../../components/master/ToggleSwitch'
import { FieldLabel, FormRow, Select, TextArea, TextInput, ViewCard, ViewField } from '../../components/master/FormField'
import { formatCurrency } from '../../lib/format'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const EMPTY_PRODUCT_FORM = {
  category_id: '',
  code: '',
  name: '',
  description: '',
  active: true,
  hsn_code: '',
  cgst_percent: '',
  sgst_percent: '',
  packing_size_id: '',
  qty_per_box: '',
  wholesale_price: '',
  retail_price: '',
  mrp: '',
}

const EMPTY_DETAIL_FORM = {
  product_id: '',
  code: '',
  packing_size_id: '',
  qty_per_box: '',
  wholesale_price: '',
  retail_price: '',
  mrp: '',
}

export default function ProductPage() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [packingSizes, setPackingSizes] = useState([])
  const [editingDetailPackingSize, setEditingDetailPackingSize] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const [expandedId, setExpandedId] = useState(null)
  const [detailsByProduct, setDetailsByProduct] = useState({})
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM)
  const [savingProduct, setSavingProduct] = useState(false)
  const [productFormError, setProductFormError] = useState(null)
  const [listError, setListError] = useState(null)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resultDialog, setResultDialog] = useState(null)
  const [pendingProductValues, setPendingProductValues] = useState(null)
  const [productConfirmOpen, setProductConfirmOpen] = useState(false)
  const [pendingDetailValues, setPendingDetailValues] = useState(null)
  const [detailConfirmOpen, setDetailConfirmOpen] = useState(false)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editingDetailId, setEditingDetailId] = useState(null)
  const [detailForm, setDetailForm] = useState(EMPTY_DETAIL_FORM)
  const [detailProductName, setDetailProductName] = useState('')
  const [savingDetail, setSavingDetail] = useState(false)
  const [detailFormError, setDetailFormError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await productsApi.list({ q: debouncedSearch, category_id: categoryFilter })
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [debouncedSearch, categoryFilter])

  useEffect(() => {
    categoriesApi.list({ active: true }).then(setCategories)
    packingSizesApi.list({ active: true }).then(setPackingSizes)
  }, [])

  // Active packing sizes for the dropdown, plus the currently-assigned one on the
  // pack-size-edit modal even if it's since been deactivated, so it stays selectable/visible.
  const packingSizeOptions = editingDetailPackingSize && !packingSizes.some((p) => p.id === editingDetailPackingSize.id)
    ? [editingDetailPackingSize, ...packingSizes]
    : packingSizes

  // Categories for the dropdown, plus the currently-assigned one even if it's not in the
  // active list, so editing always shows the product's actual category (never a wrong/first one).
  const categoryOptions =
    editingProductId && productForm.category_id !== '' && !categories.some((c) => c.id === Number(productForm.category_id))
      ? categories.concat([
          {
            id: Number(productForm.category_id),
            name: items.find((p) => p.id === editingProductId)?.category_name || 'Current category',
          },
        ])
      : categories

  async function loadDetails(productId) {
    setDetailsLoading(true)
    try {
      const data = await productDetailsApi.list({ product_id: productId })
      setDetailsByProduct((prev) => ({ ...prev, [productId]: data }))
    } finally {
      setDetailsLoading(false)
    }
  }

  function toggleExpand(product) {
    if (expandedId === product.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(product.id)
    if (!detailsByProduct[product.id]) loadDetails(product.id)
  }

  function openAdd() {
    setEditingProductId(null)
    setProductForm({ ...EMPTY_PRODUCT_FORM, category_id: categories[0]?.id ?? '' })
    setProductFormError(null)
    setProductModalOpen(true)
  }

  function openEditProduct(product) {
    setEditingProductId(product.id)
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      category_id: product.category_id,
      code: product.code,
      name: product.name,
      description: product.description || '',
      active: product.active,
      hsn_code: product.hsn_code || '',
      cgst_percent: product.cgst_percent ?? '',
      sgst_percent: product.sgst_percent ?? '',
    })
    setProductFormError(null)
    setProductModalOpen(true)
  }

  function handleProductCreate(values) {
    setProductFormError(null)
    setPendingProductValues(values)
    setProductConfirmOpen(true)
  }

  async function doCreateProduct() {
    const values = pendingProductValues
    setProductConfirmOpen(false)
    setProductModalOpen(false)
    setSavingProduct(true)
    try {
      const created = await productsApi.createWithDetail(values)
      await load()
      setResultDialog({
        variant: 'success',
        title: 'Product Added Successfully',
        message: `"${created.name}" has been added successfully.`,
      })
    } catch (err) {
      setProductModalOpen(true)
      setResultDialog({
        variant: 'error',
        title: 'Failed to Add Product',
        message: extractErrorMessage(err),
      })
    } finally {
      setSavingProduct(false)
    }
  }

  function handleProductUpdate(e) {
    e.preventDefault()
    setProductFormError(null)
    setProductConfirmOpen(true)
  }

  async function doUpdateProduct() {
    setProductConfirmOpen(false)
    setSavingProduct(true)
    const productName = productForm.name.trim()
    try {
      const payload = {
        category_id: Number(productForm.category_id),
        code: productForm.code,
        name: productForm.name,
        description: productForm.description || null,
        active: productForm.active,
        hsn_code: productForm.hsn_code || null,
        cgst_percent: productForm.cgst_percent === '' ? null : Number(productForm.cgst_percent),
        sgst_percent: productForm.sgst_percent === '' ? null : Number(productForm.sgst_percent),
      }
      await productsApi.update(editingProductId, payload)
      setProductModalOpen(false)
      await load()
      setResultDialog({
        variant: 'success',
        title: 'Product Updated Successfully',
        message: `"${productName}" has been updated successfully.`,
      })
    } catch (err) {
      setProductFormError(extractErrorMessage(err))
      setResultDialog({
        variant: 'error',
        title: 'Failed to Update Product',
        message: extractErrorMessage(err),
      })
    } finally {
      setSavingProduct(false)
    }
  }

  async function handleDeleteProduct(product) {
    setDeleteTarget(product)
  }

  async function confirmDeleteProduct() {
    if (!deleteTarget) return
    const product = deleteTarget
    setDeleteTarget(null)
    setListError(null)
    try {
      await productsApi.remove(product.id)
      if (expandedId === product.id) setExpandedId(null)
      await load()
      setResultDialog({
        variant: 'success',
        title: 'Product Deleted Successfully',
        message: `"${product.name}" has been deleted successfully.`,
      })
    } catch (err) {
      setListError(extractErrorMessage(err))
      setResultDialog({
        variant: 'error',
        title: 'Failed to Delete Product',
        message: extractErrorMessage(err),
      })
    }
  }

  async function handleToggleActive(product, active) {
    setItems((prev) => prev.map((p) => (p.id === product.id ? { ...p, active } : p)))
    try {
      await productsApi.setActive(product.id, active)
    } catch {
      setItems((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !active } : p)))
    }
  }

  function openAddDetail(product) {
    setEditingDetailId(null)
    setDetailForm({ ...EMPTY_DETAIL_FORM, product_id: product.id })
    setEditingDetailPackingSize(null)
    setDetailProductName(product.name)
    setDetailFormError(null)
    setDetailModalOpen(true)
  }

  function openEditDetail(product, detail) {
    setEditingDetailId(detail.id)
    setDetailForm({
      product_id: detail.product_id,
      code: detail.code,
      packing_size_id: detail.packing_size_id,
      qty_per_box: detail.qty_per_box,
      wholesale_price: detail.rate_per_unit ?? '',
      retail_price: detail.retail_price,
      mrp: detail.mrp,
    })
    setEditingDetailPackingSize({ id: detail.packing_size_id, label: detail.packing_size, active: true })
    setDetailProductName(product.name)
    setDetailFormError(null)
    setDetailModalOpen(true)
  }

  function handleDetailSubmit(e) {
    e.preventDefault()
    setDetailFormError(null)
    setDetailConfirmOpen(true)
  }

  async function doSaveDetail() {
    setDetailConfirmOpen(false)
    setSavingDetail(true)
    try {
      const productId = Number(detailForm.product_id)
      const payload = {
        ...detailForm,
        product_id: productId,
        packing_size_id: Number(detailForm.packing_size_id),
        qty_per_box: Number(detailForm.qty_per_box),
        rate_per_unit: detailForm.wholesale_price === '' ? null : Number(detailForm.wholesale_price),
        retail_price: Number(detailForm.retail_price),
        mrp: Number(detailForm.mrp),
      }
      if (editingDetailId) {
        await productDetailsApi.update(editingDetailId, payload)
      } else {
        await productDetailsApi.create(payload)
      }
      setDetailModalOpen(false)
      await Promise.all([loadDetails(productId), load()])
      const packLabel = `${detailForm.code || detailProductName} (${detailForm.qty_per_box}/box)`
      setResultDialog({
        variant: 'success',
        title: editingDetailId ? 'Pack Size Updated Successfully' : 'Pack Size Added Successfully',
        message: `"${packLabel}" has been ${editingDetailId ? 'updated' : 'added'} successfully.`,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Save Pack Size',
        message: extractErrorMessage(err),
      })
    } finally {
      setSavingDetail(false)
    }
  }

  return (
    <div>
      

      <main className="space-y-4 px-6 py-6">
      <PageToolbar
        title="Product"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by code or name..."
        onAdd={openAdd}
        addLabel="Add Product"
        onReset={() => {
          setSearch('')
          setCategoryFilter('')
        }}
        filters={
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sm:w-48"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        }
      />

      {listError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{listError}</div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-brand-900 text-xs uppercase tracking-wide text-white">
              <th className="w-10 px-3 py-3" />
              <th className="px-5 py-3 font-medium">Product Code</th>
              <th className="px-5 py-3 font-medium">Product Name</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">HSN Code</th>
              <th className="px-5 py-3 font-medium">GST %</th>
              <th className="px-5 py-3 text-right font-medium">MRP</th>
              <th className="px-5 py-3 text-right font-medium">Retail Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td colSpan={10} className="px-5 py-3.5">
                    <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-8 text-center text-sm text-slate-400">
                  No products found.
                </td>
              </tr>
            )}

            {!loading &&
              items.map((product, i) => {
                const isExpanded = expandedId === product.id
                const gstTotal = (product.cgst_percent ?? 0) + (product.sgst_percent ?? 0)
                const details = detailsByProduct[product.id]
                return (
                  <Fragment key={product.id}>
                    <tr className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                      <td className="px-3 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(product)}
                          aria-label={isExpanded ? `Collapse ${product.name}` : `Expand ${product.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">{product.code}</td>
                      <td className="px-5 py-3.5">{product.name}</td>
                      <td className="px-5 py-3.5">{product.category_name || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5">{product.hsn_code || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5">
                        {product.cgst_percent == null && product.sgst_percent == null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          `${gstTotal}%`
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {product.mrp_amount == null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          formatCurrency(product.mrp_amount)
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {product.retail_price_amount == null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          formatCurrency(product.retail_price_amount)
                        )}
                      </td>
                                            <td className="px-5 py-3.5">
                        <ToggleSwitch checked={product.active} onChange={(v) => handleToggleActive(product, v)} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingProduct(product)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
                            aria-label="View"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditProduct(product)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${product.id}-details`} className="border-b border-slate-50 bg-slate-50/50 last:border-0">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="flex items-center justify-between pb-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Pack Sizes for {product.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => openAddDetail(product)}
                              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-brand-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-brand-50"
                            >
                              <Plus size={14} strokeWidth={2.5} />
                              Add Pack Size
                            </button>
                          </div>

                          {detailsLoading && !details && (
                            <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                          )}

                          {details && details.length === 0 && (
                            <p className="text-sm text-slate-400">No pack sizes yet.</p>
                          )}

                          {details && details.length > 0 && (
                            <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-900/5">
                              <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                  <tr className="bg-brand-900 text-xs uppercase tracking-wide text-white">
                                    <th className="px-4 py-2 font-medium">Pack Code</th>
                                    <th className="px-4 py-2 font-medium">Packing Size</th>
                                    <th className="px-4 py-2 text-right font-medium">Qty / Box</th>
                                    <th className="px-4 py-2 text-right font-medium">MRP</th>
                                    <th className="px-4 py-2 text-right font-medium">Wholesale</th>
                                    <th className="px-4 py-2 text-right font-medium">Retail Price</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.map((detail) => (
                                    <tr key={detail.id} className="border-b border-slate-50 last:border-0">
                                      <td className="px-4 py-2.5">{detail.code}</td>
                                      <td className="px-4 py-2.5">{detail.packing_size}</td>
                                      <td className="px-4 py-2.5 text-right tabular-nums">{detail.qty_per_box}</td>
                                      <td className="px-4 py-2.5 text-right tabular-nums">
                                        {formatCurrency(detail.mrp)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right tabular-nums">
                                        {formatCurrency(detail.rate_per_unit)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right tabular-nums">
                                        {formatCurrency(detail.retail_price)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => openEditDetail(product, detail)}
                                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                                          aria-label={`Edit ${detail.code}`}
                                        >
                                          <Pencil size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
          </tbody>
        </table>
      </div>

      {productModalOpen && (
        <Modal
          title={editingProductId ? 'Edit Product' : 'Add Product'}
          onClose={() => setProductModalOpen(false)}
          wide
          footer={
            <>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={savingProduct}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {savingProduct ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
{editingProductId ? (
          <form id="product-form" onSubmit={handleProductUpdate} className="space-y-4">
            {productFormError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {productFormError}
              </div>
            )}
            <FormRow cols={2}>
              <div>
                <FieldLabel required>Category</FieldLabel>
                <Select
                  required
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!categories.some((x) => x.id === c.id) ? ' (inactive)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel required>Product Code</FieldLabel>
                <TextInput
                  required
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  placeholder="e.g. PRD-1001"
                />
              </div>
            </FormRow>

            <div>
              <FieldLabel required>Name</FieldLabel>
              <TextInput
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Product name"
              />
            </div>

            <FormRow cols={3}>
              <div>
                <FieldLabel>HSN Code</FieldLabel>
                <TextInput
                  value={productForm.hsn_code}
                  onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })}
                  placeholder="e.g. 2105"
                />
              </div>
              <div>
                <FieldLabel>CGST (%)</FieldLabel>
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.cgst_percent}
                  onChange={(e) => setProductForm({ ...productForm, cgst_percent: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>SGST (%)</FieldLabel>
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.sgst_percent}
                  onChange={(e) => setProductForm({ ...productForm, sgst_percent: e.target.value })}
                />
              </div>
            </FormRow>

            <div>
              <FieldLabel>Description</FieldLabel>
              <TextArea
                rows={3}
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </form>
        ) : (
          <AddProductForm
            formId="product-form"
            categories={categories}
            packingSizes={packingSizes}
            onSubmit={handleProductCreate}
            onSavingChange={setSavingProduct}
            // showWholesale
          />
        )}
        </Modal>
      )}

      {detailModalOpen && (
        <Modal
          title={editingDetailId ? 'Edit Pack Size' : 'Add Pack Size'}
          onClose={() => setDetailModalOpen(false)}
          wide
          footer={
            <>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="product-detail-form"
                disabled={savingDetail}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {savingDetail ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <form id="product-detail-form" onSubmit={handleDetailSubmit} className="space-y-4">
            {detailFormError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {detailFormError}
              </div>
            )}
            <div>
              <FieldLabel>Product</FieldLabel>
              <TextInput value={detailProductName} disabled />
            </div>

            <FormRow cols={2}>
              <div>
                <FieldLabel required>Pack Code</FieldLabel>
                <TextInput
                  required
                  value={detailForm.code}
                  onChange={(e) => setDetailForm({ ...detailForm, code: e.target.value })}
                  placeholder="e.g. CUP-VANILLA-0030"
                />
              </div>
              <div>
                <FieldLabel required>Packing Size</FieldLabel>
                <Select
                  required
                  value={detailForm.packing_size_id}
                  onChange={(e) => setDetailForm({ ...detailForm, packing_size_id: e.target.value })}
                >
                  <option value="" disabled>
                    Select packing size
                  </option>
                  {packingSizeOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                      {!p.active ? ' (inactive)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </FormRow>

            <FormRow cols={4}>
              <div>
                <FieldLabel required>Qty per Box</FieldLabel>
                <TextInput
                  required
                  type="number"
                  min="0"
                  value={detailForm.qty_per_box}
                  onChange={(e) => setDetailForm({ ...detailForm, qty_per_box: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel required>MRP (INR)</FieldLabel>
                <TextInput
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={detailForm.mrp}
                  onChange={(e) => setDetailForm({ ...detailForm, mrp: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Wholesale / TCD Price (INR)</FieldLabel>
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={detailForm.wholesale_price}
                  onChange={(e) => setDetailForm({ ...detailForm, wholesale_price: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel required>Retail Price (INR)</FieldLabel>
                <TextInput
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={detailForm.retail_price}
                  onChange={(e) => setDetailForm({ ...detailForm, retail_price: e.target.value })}
                />
              </div>
            </FormRow>
          </form>
        </Modal>
      )}
      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete Product?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteProduct}
      />
      <ConfirmDialog
        open={productConfirmOpen}
        title={editingProductId ? 'Save Product?' : 'Add Product?'}
        message={
          editingProductId
            ? `Are you sure you want to save changes to "${productForm.name.trim() || 'this product'}"?`
            : `Are you sure you want to add "${pendingProductValues?.name?.trim() || 'this product'}"?`
        }
        confirmLabel="Save"
        onCancel={() => setProductConfirmOpen(false)}
        onConfirm={editingProductId ? doUpdateProduct : doCreateProduct}
        busy={savingProduct}
      />
      <ConfirmDialog
        open={detailConfirmOpen}
        title={editingDetailId ? 'Save Pack Size?' : 'Add Pack Size?'}
        message={`Are you sure you want to ${
          editingDetailId ? 'save changes to' : 'add'
        } "${detailForm.code || detailProductName}"?`}
        confirmLabel="Save"
        onCancel={() => setDetailConfirmOpen(false)}
        onConfirm={doSaveDetail}
        busy={savingDetail}
      />
      <AlertDialog
        open={resultDialog != null}
        variant={resultDialog?.variant ?? 'success'}
        title={resultDialog?.title ?? ''}
        message={resultDialog?.message ?? ''}
        onClose={() => setResultDialog(null)}
      />

      {viewingProduct && (
        <Modal 
          title="Product Details" 
          onClose={() => setViewingProduct(null)} 
          size="xl"
          footer={
            <button
              type="button"
              onClick={() => setViewingProduct(null)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Close
            </button>
          }
        >
          <div className="space-y-6">
            <ViewCard title="General Information">
              <ViewField label="Product Code" value={viewingProduct.code} />
              <ViewField label="Product Name" value={viewingProduct.name} />
              <ViewField label="Category" value={viewingProduct.category_name} />
              <ViewField label="Status" value={viewingProduct.active ? 'Active' : 'Inactive'} />
            </ViewCard>

            <ViewCard title="Pricing & Tax">
              <ViewField label="HSN Code" value={viewingProduct.hsn_code} />
              <ViewField 
                label="GST" 
                value={
                  viewingProduct.cgst_percent == null && viewingProduct.sgst_percent == null 
                  ? '—' 
                  : `${(viewingProduct.cgst_percent || 0) + (viewingProduct.sgst_percent || 0)}%`
                } 
              />
              <ViewField label="MRP" value={viewingProduct.mrp_amount ? formatCurrency(viewingProduct.mrp_amount) : '—'} />
              <ViewField label="Retail Price" value={viewingProduct.retail_price_amount ? formatCurrency(viewingProduct.retail_price_amount) : '—'} />
            </ViewCard>

            <ViewCard title="Description">
              <ViewField label="Description" value={viewingProduct.description} />
            </ViewCard>
          </div>
        </Modal>
      )}
      </main>
    </div>
  )
}
