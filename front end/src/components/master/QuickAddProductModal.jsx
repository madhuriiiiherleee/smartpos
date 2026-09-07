import { useState } from 'react'
import { extractErrorMessage, productsApi } from '../../api/master'
import AddProductForm from './AddProductForm'
import Modal from './Modal'
import AlertDialog from '../shared/AlertDialog'
import ConfirmDialog from '../shared/ConfirmDialog'

export default function QuickAddProductModal({ categories, packingSizes, defaultCategoryId, onClose, onCreated }) {
  const [saving, setSaving] = useState(false)
  const [pendingValues, setPendingValues] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  function handleSubmit(values) {
    setPendingValues(values)
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    try {
      const created = await productsApi.createWithDetail(pendingValues)
      setResultDialog({
        variant: 'success',
        title: 'Product Added Successfully',
        message: `"${created.name}" has been added successfully.`,
        completed: created,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Add Product',
        message: extractErrorMessage(err),
      })
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
      <AddProductForm
        formId="quick-add-product-form"
        categories={categories}
        packingSizes={packingSizes}
        initial={{ category_id: defaultCategoryId || '' }}
        onSubmit={handleSubmit}
        onSavingChange={setSaving}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Add Product?"
        message={`Are you sure you want to add "${pendingValues?.name?.trim() || 'this product'}"?`}
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
          const created = resultDialog?.completed
          setResultDialog(null)
          if (created && typeof onCreated === 'function') {
            onCreated(created)
          }
        }}
      />
    </Modal>
  )
}
