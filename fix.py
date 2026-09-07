import re

def fix_vendor():
    p = r'D:\harshithacontinue\smartpos-main\smartpos-main\front end\src\pages\master-settings\VendorPage.jsx'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # 1. Imports
    c = c.replace(
        "import { Pencil } from 'lucide-react'",
        "import { Eye, Pencil } from 'lucide-react'"
    )
    c = c.replace(
        "import { useDebouncedValue } from '../../lib/useDebouncedValue'",
        "import { ViewCard, ViewField } from '../../components/master/FormField'\nimport { useDebouncedValue } from '../../lib/useDebouncedValue'"
    )

    # 2. State
    c = c.replace(
        "const [resultDialog, setResultDialog] = useState(null)",
        "const [resultDialog, setResultDialog] = useState(null)\n  const [viewingVendor, setViewingVendor] = useState(null)"
    )

    # 3. Actions
    c = c.replace(
        "<Pencil size={14} /> Edit\n          </button>",
        "<Pencil size={14} /> Edit\n          </button>\n          </div>"
    )
    c = c.replace(
        "actions={(row) => (\n          <button",
        "actions={(row) => (\n          <div className=\"flex items-center justify-end gap-1\">\n            <button\n              type=\"button\"\n              onClick={() => setViewingVendor(row)}\n              className=\"inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100\"\n              aria-label={View \}\n            >\n              <Eye size={14} /> View\n            </button>\n            <button"
    )

    # 4. View Modal
    modal = '''      <AlertDialog
        open={resultDialog != null}
        variant={resultDialog?.variant ?? 'success'}
        title={resultDialog?.title ?? ''}
        message={resultDialog?.message ?? ''}
        onClose={() => setResultDialog(null)}
      />

      {viewingVendor && (
        <Modal title="Vendor Details" onClose={() => setViewingVendor(null)} wide>
          <div className="space-y-6">
            <ViewCard title="Vendor Information">
              <ViewField label="Vendor Name" value={viewingVendor.name} />
              <ViewField label="Contact Person" value={viewingVendor.contact_person} />
              <ViewField label="GSTIN" value={viewingVendor.gst_number} />
              <ViewField label="Status" value={viewingVendor.active ? 'Active' : 'Inactive'} />
            </ViewCard>

            <ViewCard title="Contact & Address">
              <ViewField label="Phone" value={viewingVendor.phone} />
              <ViewField label="Email" value={viewingVendor.email} />
              <ViewField 
                label="Address" 
                value={[
                  viewingVendor.address_line1,
                  viewingVendor.address_line2,
                  viewingVendor.city,
                  viewingVendor.state,
                  viewingVendor.pincode
                ].filter(Boolean).join(', ')} 
              />
            </ViewCard>
          </div>
        </Modal>
      )}'''
    c = c.replace("      <AlertDialog\n        open={resultDialog != null}\n        variant={resultDialog?.variant ?? 'success'}\n        title={resultDialog?.title ?? ''}\n        message={resultDialog?.message ?? ''}\n        onClose={() => setResultDialog(null)}\n      />", modal)

    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)


def fix_product():
    p = r'D:\harshithacontinue\smartpos-main\smartpos-main\front end\src\pages\master-settings\ProductPage.jsx'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Imports
    c = c.replace(
        "import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'",
        "import { ChevronDown, ChevronRight, Eye, Pencil, Plus, Trash2 } from 'lucide-react'"
    )
    c = c.replace(
        "import { FieldLabel, FormRow, Select, TextArea, TextInput } from '../../components/master/FormField'",
        "import { FieldLabel, FormRow, Select, TextArea, TextInput, ViewCard, ViewField } from '../../components/master/FormField'"
    )

    # 2. State
    c = c.replace(
        "const [deleteTarget, setDeleteTarget] = useState(null)",
        "const [viewingProduct, setViewingProduct] = useState(null)\n  const [deleteTarget, setDeleteTarget] = useState(null)"
    )

    # 3. Actions
    c = c.replace(
        "onClick={() => openEditProduct(product)}",
        "onClick={() => setViewingProduct(product)}\n                            className=\"inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100\"\n                            aria-label={View \}\n                          >\n                            <Eye size={14} /> View\n                          </button>\n                          <button\n                            type=\"button\"\n                            onClick={() => openEditProduct(product)}"
    )

    # 4. View Modal
    modal = '''      <AlertDialog
        open={resultDialog != null}
        variant={resultDialog?.variant ?? 'success'}
        title={resultDialog?.title ?? ''}
        message={resultDialog?.message ?? ''}
        onClose={() => setResultDialog(null)}
      />

      {viewingProduct && (
        <Modal title="Product Details" onClose={() => setViewingProduct(null)} wide>
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
                  : \%
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
      )}'''
    c = c.replace("      <AlertDialog\n        open={resultDialog != null}\n        variant={resultDialog?.variant ?? 'success'}\n        title={resultDialog?.title ?? ''}\n        message={resultDialog?.message ?? ''}\n        onClose={() => setResultDialog(null)}\n      />", modal)

    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)

fix_vendor()
fix_product()
