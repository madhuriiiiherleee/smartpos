import { useState } from 'react'
import { extractErrorMessage, productsApi } from '../../api/master'
import { FieldLabel, FormRow, Select, TextInput } from './FormField'
import Modal from './Modal'

const EMPTY_QUICK_PRODUCT = {
  category_id: '',
  code: '',
  name: '',
  packing_size_id: '',
  qty_per_box: '',
  rate_per_unit: '',
  retail_price: '',
  mrp: '',
}

export default function QuickAddProductModal({ categories, packingSizes, defaultCategoryId, onClose, onCreated }) {
  const [quickForm, setQuickForm] = useState({ ...EMPTY_QUICK_PRODUCT, category_id: defaultCategoryId || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = await productsApi.createWithDetail({
        category_id: Number(quickForm.category_id),
        code: quickForm.code,
        name: quickForm.name,
        packing_size_id: Number(quickForm.packing_size_id),
        qty_per_box: Number(quickForm.qty_per_box),
        rate_per_unit: Number(quickForm.rate_per_unit),
        retail_price: Number(quickForm.retail_price),
        mrp: Number(quickForm.mrp),
      })
      onCreated(created)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Add Product"
      onClose={onClose}
      wide
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="quick-add-product-form"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="quick-add-product-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
        )}
        <FormRow cols={2}>
          <div>
            <FieldLabel required>Category</FieldLabel>
            <Select
              required
              value={quickForm.category_id}
              onChange={(e) => setQuickForm({ ...quickForm, category_id: e.target.value })}
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel required>Barcode / Product Code</FieldLabel>
            <TextInput
              required
              value={quickForm.code}
              onChange={(e) => setQuickForm({ ...quickForm, code: e.target.value })}
            />
          </div>
        </FormRow>
        <div>
          <FieldLabel required>Name</FieldLabel>
          <TextInput
            required
            value={quickForm.name}
            onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
          />
        </div>
        <FormRow cols={2}>
          <div>
            <FieldLabel required>Packing Size</FieldLabel>
            <Select
              required
              value={quickForm.packing_size_id}
              onChange={(e) => setQuickForm({ ...quickForm, packing_size_id: e.target.value })}
            >
              <option value="" disabled>
                Select packing size
              </option>
              {packingSizes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel required>Qty per Box</FieldLabel>
            <TextInput
              required
              type="number"
              min="0"
              value={quickForm.qty_per_box}
              onChange={(e) => setQuickForm({ ...quickForm, qty_per_box: e.target.value })}
            />
          </div>
        </FormRow>
        <FormRow cols={3}>
          <div>
            <FieldLabel required>Wholesale Price</FieldLabel>
            <TextInput
              required
              type="number"
              step="0.01"
              min="0"
              value={quickForm.rate_per_unit}
              onChange={(e) => setQuickForm({ ...quickForm, rate_per_unit: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel required>Retail Price</FieldLabel>
            <TextInput
              required
              type="number"
              step="0.01"
              min="0"
              value={quickForm.retail_price}
              onChange={(e) => setQuickForm({ ...quickForm, retail_price: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel required>MRP</FieldLabel>
            <TextInput
              required
              type="number"
              step="0.01"
              min="0"
              value={quickForm.mrp}
              onChange={(e) => setQuickForm({ ...quickForm, mrp: e.target.value })}
            />
          </div>
        </FormRow>
      </form>
    </Modal>
  )
}
