import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { salesApi } from '../../api/sales'
import { companyProfileApi } from '../../api/company'
import SalesInvoiceBody from '../../components/sales/SalesInvoiceBody'

export default function SalesInvoicePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [sale, setSale] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState(searchParams.get('size') === 'A5' ? 'A5' : 'A4')

  useEffect(() => {
    Promise.all([salesApi.get(id), companyProfileApi.get()]).then(([saleData, companyData]) => {
      setSale(saleData)
      setCompany(companyData)
      setLoading(false)
      if (searchParams.get('autoprint') === '1') {
        setTimeout(() => window.print(), 300)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading || !sale) {
    return (
      <div className="px-6 py-6">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  return (
    <div
      className={`mx-auto max-w-3xl px-6 py-6 print:max-w-none print:px-0 print:py-0 ${
        pageSize === 'A5' ? 'invoice-print-a5' : 'invoice-print-a4'
      }`}
    >
      <div className="mb-4 flex items-center justify-end gap-3 print:hidden">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {['A4', 'A5'].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setPageSize(size)}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                pageSize === size ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Printer size={16} />
          Print / Save as PDF
        </button>
      </div>

      <div
        className={`rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none ${
          pageSize === 'A5' ? 'print:p-[8mm]' : 'print:p-[12mm]'
        }`}
      >
        <SalesInvoiceBody sale={sale} company={company} />
      </div>
    </div>
  )
}
