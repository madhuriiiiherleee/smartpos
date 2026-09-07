import os
import re

def process_file(filepath, back_link, text_edit, text_new):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the PageHeader function and replace it entirely
    page_header_pattern = re.compile(r'function PageHeader\(\{\s*isEdit\s*\}\)\s*\{\s*return\s*null\s*\}', re.DOTALL)
    
    replacement = f'''function PageHeader({{ isEdit }}) {{
  return (
    <div className="mb-6 flex items-center gap-3">
      <Link
        to="{back_link}"
        aria-label="Back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
      >
        <ArrowLeft size={{18}} />
      </Link>
      <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">
        {{isEdit ? '{text_edit}' : '{text_new}'}}
      </h1>
    </div>
  )
}}'''
    
    content = page_header_pattern.sub(replacement, content)
    
    # Also remove any stray h1 in loading state that was added earlier
    content = re.sub(r'<main className="px-6 py-6">\s*<div className="mb-6 flex items-center justify-between">\s*<h1[^>]*>.*?</h1>\s*</div>', '<main className="px-6 py-6">', content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('front end/src/pages/purchase/PurchaseEntryPage.jsx', '/purchase/manage', 'EDIT PURCHASE', 'PURCHASE ENTRY')
process_file('front end/src/pages/sales/SalesEntryPage.jsx', '/sales/view', 'EDIT SALE', 'SALES ENTRY')
process_file('front end/src/pages/sales/SalesOrderEntryPage.jsx', '/sales/order/view', 'EDIT SALES ORDER', 'SALES ORDER ENTRY')
