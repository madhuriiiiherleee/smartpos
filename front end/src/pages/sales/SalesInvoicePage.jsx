import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Printer, Download, LoaderCircle } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { toCanvas } from 'html-to-image'
import { salesApi } from '../../api/sales'
import { companyProfileApi } from '../../api/company'
import SalesInvoiceBody from '../../components/sales/SalesInvoiceBody'

export default function SalesInvoicePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [sale, setSale] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [pageSize, setPageSize] = useState(searchParams.get('size') === 'A5' ? 'A5' : 'A4')
  const cardRef = useRef(null)

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

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const canvas = await toCanvas(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: pageSize === 'A5' ? 'a5' : 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = pageSize === 'A5' ? 8 : 12
      const ratio = canvas.height / canvas.width
      let w = pageW - margin * 2
      let h = w * ratio
      if (h > pageH - margin * 2) {
        h = pageH - margin * 2
        w = h / ratio
      }
      pdf.addImage(imgData, 'PNG', margin, margin, w, h)
      const safeNo = String(sale.order_no || sale.id).replace(/[^\w.-]+/g, '-')
      pdf.save(`Invoice-${safeNo}.pdf`)
    } catch (err) {
      console.error('PDF download failed', err)
      window.alert('Sorry, the PDF could not be generated. Please use Print / Save as PDF instead.')
    } finally {
      setDownloading(false)
    }
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
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {downloading ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
          Download PDF
        </button>
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
        ref={cardRef}
        className={`rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none ${
          pageSize === 'A5' ? 'print:p-[8mm]' : 'print:p-[12mm]'
        }`}
      >
        <SalesInvoiceBody sale={sale} company={company} />
      </div>
    </div>
  )
}
