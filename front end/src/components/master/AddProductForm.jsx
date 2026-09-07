import { useState } from 'react'
import { extractErrorMessage } from '../../api/master'
import { FieldLabel, FormRow, Select, TextArea, TextInput } from './FormField'

const EMPTY_PRODUCT = {
  category_id: '',
  code: '',
  name: '',
  description: '',
  hsn_code: '',
  cgst_percent: '',
  sgst_percent: '',
  packing_size_id: '',
  qty_per_box: '',
  wholesale_price: '',
  retail_price: '',
  mrp: '',
}

export default function AddProductForm({
  formId,
  categories,
  packingSizes,
  initial = {},
  onSubmit,
  onSavingChange,
  // showWholesale = true,
}) {
  const [form, setForm] = useState({
    ...EMPTY_PRODUCT,
    ...initial,
    category_id: initial.category_id ?? categories[0]?.id ?? '',
  })
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    onSavingChange?.(true)
    try {
      await onSubmit({
        category_id: Number(form.category_id),
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        hsn_code: form.hsn_code.trim() || null,
        cgst_percent: form.cgst_percent === '' ? null : Number(form.cgst_percent),
        sgst_percent: form.sgst_percent === '' ? null : Number(form.sgst_percent),
        packing_size_id: Number(form.packing_size_id),
        qty_per_box: Number(form.qty_per_box),
        rate_per_unit: form.wholesale_price === '' ? null : Number(form.wholesale_price),
        retail_price: Number(form.retail_price),
        mrp: Number(form.mrp),
      })
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      onSavingChange?.(false)
    }
  }

  function update(partial) {
    setForm((f) => ({ ...f, ...partial }))
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
      )}
      <FormRow cols={2}>
        <div>
          <FieldLabel required>Category</FieldLabel>
          <Select
            required
            value={form.category_id}
            onChange={(e) => update({ category_id: e.target.value })}
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
          <FieldLabel required>Product Code</FieldLabel>
          <TextInput
            required
            value={form.code}
            onChange={(e) => update({ code: e.target.value })}
            placeholder="e.g. PRD-1001"
          />
        </div>
      </FormRow>

      <div>
        <FieldLabel required>Name</FieldLabel>
        <TextInput
          required
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Product name"
        />
      </div>

      <FormRow cols={2}>
        <div>
          <FieldLabel required>Packing Size</FieldLabel>
          <Select
            required
            value={form.packing_size_id}
            onChange={(e) => update({ packing_size_id: e.target.value })}
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
            value={form.qty_per_box}
            onChange={(e) => update({ qty_per_box: e.target.value })}
          />
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div>
          <FieldLabel required>MRP (INR)</FieldLabel>
          <TextInput
            required
            type="number"
            step="0.01"
            min="0"
            value={form.mrp}
            onChange={(e) => update({ mrp: e.target.value })}
          />
        </div>
        {/* Commented out: Wholesale / TCD Price not needed
        {showWholesale && (
          <div>
            <FieldLabel>Wholesale / TCD Price (INR)</FieldLabel>
            <TextInput
              type="number"
              step="0.01"
              min="0"
              value={form.wholesale_price}
              onChange={(e) => update({ wholesale_price: e.target.value })}
            />
          </div>
        )}
        */}
        <div>
          <FieldLabel required>Retail Price (INR)</FieldLabel>
          <TextInput
            required
            type="number"
            step="0.01"
            min="0"
            value={form.retail_price}
            onChange={(e) => update({ retail_price: e.target.value })}
          />
        </div>
      </FormRow>

      <FormRow cols={3}>
        <div>
          <FieldLabel>HSN Code</FieldLabel>
          <TextInput
            value={form.hsn_code}
            onChange={(e) => update({ hsn_code: e.target.value })}
            placeholder="e.g. 2105"
          />
        </div>
        <div>
          <FieldLabel>CGST (%)</FieldLabel>
          <TextInput
            type="number"
            step="0.01"
            min="0"
            value={form.cgst_percent}
            onChange={(e) => update({ cgst_percent: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>SGST (%)</FieldLabel>
          <TextInput
            type="number"
            step="0.01"
            min="0"
            value={form.sgst_percent}
            onChange={(e) => update({ sgst_percent: e.target.value })}
          />
        </div>
      </FormRow>

      <div>
        <FieldLabel>Description</FieldLabel>
        <TextArea
          rows={3}
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Optional description"
        />
      </div>

      <p className="text-xs text-slate-400">
        This creates the product with its first pack size. Add more pack sizes later from the Product screen.
      </p>
    </form>
  )
}
