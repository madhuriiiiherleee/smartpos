import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { purchasesApi } from '../../api/purchase'
import { companyProfileApi } from '../../api/company'
import PurchaseInvoiceBody from '../../components/purchase/PurchaseInvoiceBody'

export default function PurchaseInvoicePage() {
  const { id } = useParams()
  const [purchase, setPurchase] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([purchasesApi.get(id), companyProfileApi.get()]).then(([purchaseData, companyData]) => {
      setPurchase(purchaseData)
      setCompany(companyData)
      setLoading(false)
    })
  }, [id])

  if (loading || !purchase) {
    return (
      <div className="px-6 py-6">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-end gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Printer size={16} />
          Print / Save as PDF
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-[12mm] print:shadow-none">
        <PurchaseInvoiceBody purchase={purchase} company={company} />
      </div>
    </div>
  )
}
