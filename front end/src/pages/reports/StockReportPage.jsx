import { useEffect, useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { categoriesApi, productsApi } from '../../api/master'
import { reportsApi } from '../../api/reports'
import { FieldLabel, Select } from '../../components/master/FormField'

export default function StockReportPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [categoryId, setCategoryId] = useState('')
  const [productId, setProductId] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({})
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    categoriesApi.list({ active: true }).then(setCategories)
    productsApi.list({ active: true }).then(setProducts)
  }, [])

  useEffect(() => {
    setLoading(true)
    reportsApi
      .stock({ category_id: appliedFilters.categoryId || undefined, product_id: appliedFilters.productId || undefined })
      .then(setRows)
      .finally(() => setLoading(false))
  }, [appliedFilters])

  const filteredProducts = useMemo(
    () => (categoryId ? products.filter((p) => p.category_id === Number(categoryId)) : products),
    [products, categoryId],
  )

  function handleCategoryChange(value) {
    setCategoryId(value)
    setProductId('')
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedFilters({ categoryId, productId })
    }, 300)
    return () => clearTimeout(timer)
  }, [categoryId, productId])

  return (
    <div>
      

      <h1 className="hidden px-1 pb-3 text-lg font-semibold text-slate-800 print:block uppercase tracking-wide">Stock Report</h1>

      <main className="space-y-4 px-6 py-6 print:space-y-0 print:p-[12mm]">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Stock Report</h1>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 print:hidden">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Product</FieldLabel>
              <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">All Products</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Printer size={16} />
                Print
              </button>
              <a
                href={reportsApi.stockExportUrl({
                  category_id: appliedFilters.categoryId || undefined,
                  product_id: appliedFilters.productId || undefined,
                })}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Download size={16} />
                Export
              </a>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 print:overflow-visible print:rounded-none print:shadow-none print:ring-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#103252] text-xs uppercase tracking-wide text-white">
                  <th className="px-5 py-3 font-medium">SL #</th>
                  <th className="px-5 py-3 font-medium">Product Code</th>
                  <th className="px-5 py-3 font-medium">Product Name</th>
                  <th className="px-5 py-3 font-medium">Pack Code</th>
                  <th className="px-5 py-3 font-medium">Packing Size</th>
                  <th className="px-5 py-3 text-right font-medium">Available Stock</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3.5" colSpan={6}>
                        <div className="h-4 w-full max-w-xs animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                      No products found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((r) => (
                    <tr key={`${r.product_code}-${r.code}`} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">{r.sl_no}</td>
                      <td className="px-5 py-3.5 font-medium">{r.product_code}</td>
                      <td className="px-5 py-3.5">{r.product_name}</td>
                      <td className="px-5 py-3.5">{r.code}</td>
                      <td className="px-5 py-3.5">{r.packing_size}</td>
                      <td
                        className={`px-5 py-3.5 text-right font-semibold tabular-nums ${
                          r.available_quantity < 0 ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {r.available_quantity}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
