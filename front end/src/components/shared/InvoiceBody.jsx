import { formatBoxBreakdown, formatCurrencyPrecise } from '../../lib/format'

export default function InvoiceBody({
  doc,
  company,
  title,
  dateText,
  partyLabel,
  partyName,
  partyAttn = null,
  rightLines = [],
  paymentLabel,
  priceKey = 'price',
  showRetailPrice = false,
  showDiscount = false,
  extraTotalsRows = [],
  declaration = null,
}) {
  return (
    <div className="invoice-body flex min-h-screen flex-col rounded-2xl bg-white print:rounded-none">
      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 uppercase tracking-wide">{company?.company_name || 'Company Name'}</h1>
          {formatCompanyAddress(company) && (
            <p className="text-xs text-slate-500">{formatCompanyAddress(company)}</p>
          )}
          {company?.gstin && <p className="text-xs text-slate-500">GSTIN: {company.gstin}</p>}
          {company?.contact_no_1 && <p className="text-xs text-slate-500">Ph: {company.contact_no_1}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
          <p className="text-xs text-slate-500">Invoice #: {doc.invoice_no}</p>
          <p className="text-xs text-slate-500">Date: {dateText}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-700">{partyLabel}</p>
          <p className="text-slate-600">{partyName}</p>
          {partyAttn && <p className="text-slate-500">{partyAttn}</p>}
          {shippingAddressLines(doc).map((line, i) => (
            <p key={i} className="text-slate-500">
              {line}
            </p>
          ))}
        </div>
        <div className="sm:text-right">
          {rightLines.map((line) => (
            <p key={line} className="text-slate-500">
              {line}
            </p>
          ))}
          {paymentLabel && <p className="text-slate-500">{paymentLabel}</p>}
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
              <th className="py-2 font-medium">#</th>
              <th className="py-2 font-medium">Product</th>
              <th className="py-2 font-medium">HSN</th>
              <th className="py-2 text-right font-medium">Qty</th>
              {showRetailPrice && <th className="py-2 text-right font-medium">Retail Price</th>}
              <th className="py-2 text-right font-medium">Price</th>
              {showDiscount && <th className="py-2 text-right font-medium">Discount</th>}
              <th className="py-2 text-right font-medium">Taxable</th>
              <th className="py-2 text-right font-medium">GST Value</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                <td className="py-2 text-slate-400">{index + 1}</td>
                <td className="py-2 font-medium">
                  {item.product_name}
                  {item.packing_size && <span className="font-normal text-slate-400"> ({item.packing_size})</span>}
                </td>
                <td className="py-2 text-slate-500">{item.hsn_code || <span className="text-slate-300">—</span>}</td>
                <td className="py-2 text-right tabular-nums">
                  {item.quantity} pcs
                  {formatBoxBreakdown(item.quantity, item.qty_per_box) && (
                    <div className="text-[10px] font-normal text-slate-400">
                      ({formatBoxBreakdown(item.quantity, item.qty_per_box)})
                    </div>
                  )}
                </td>
                {showRetailPrice && (
                  <td className="py-2 text-right tabular-nums">
                    {item.retail_price == null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      formatCurrencyPrecise(item.retail_price)
                    )}
                  </td>
                )}
                <td className="py-2 text-right tabular-nums">{formatCurrencyPrecise(item[priceKey])}</td>
                {showDiscount && (
                  <td className="py-2 text-right tabular-nums text-slate-500">
                    {item.discount_percent > 0 ? `${item.discount_percent}%` : '—'}
                  </td>
                )}
                <td className="py-2 text-right tabular-nums">{formatCurrencyPrecise(item.taxable_amount)}</td>
                <td className="py-2 text-right tabular-nums text-slate-500">
                  {item.is_igst ? `IGST ${item.gst_percent}%` : `${item.gst_percent}%`} (
                  {formatCurrencyPrecise(item.gst_amount)})
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{formatCurrencyPrecise(item.grand_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-full space-y-1 text-xs sm:w-64">
          <div className="flex justify-between">
            <span className="text-slate-500">Taxable Amount</span>
            <span className="tabular-nums text-slate-700">{formatCurrencyPrecise(doc.taxable_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">GST Amount</span>
            <span className="tabular-nums text-slate-700">{formatCurrencyPrecise(doc.gst_amount)}</span>
          </div>
          {doc.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span className="tabular-nums text-slate-700">- {formatCurrencyPrecise(doc.discount)}</span>
            </div>
          )}
          {extraTotalsRows
            .filter((row) => row.show)
            .map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-slate-500">{row.label}</span>
                <span className="tabular-nums text-slate-700">{formatCurrencyPrecise(row.value)}</span>
              </div>
            ))}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold text-brand-600">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatCurrencyPrecise(doc.amount)}</span>
          </div>
        </div>
      </div>

      {declaration && (
        <p className="mt-6 border-t border-slate-100 pt-3 text-[10px] text-slate-400">{declaration}</p>
      )}
    </div>
  )
}

function formatCompanyAddress(company) {
  if (!company) return ''
  return [company.address_line1, company.address_line2, company.city, company.state, company.pincode]
    .filter(Boolean)
    .join(', ')
}

function shippingAddressLines(doc) {
  const cityState = [doc.shipping_city, doc.shipping_state].filter(Boolean).join(', ')
  const cityStatePincode = [cityState, doc.shipping_pincode].filter(Boolean).join(' - ')
  return [doc.shipping_address_line1, doc.shipping_address_line2, cityStatePincode].filter(Boolean)
}
