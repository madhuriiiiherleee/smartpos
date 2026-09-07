import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency3 } from '../../lib/format'

export default function ItemsTable({
  items,
  onRemove,
  onEdit = null,
  priceFieldName,
  emptyMessage,
  actionColumnLabel = 'Actions',
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-brand-600 text-xs uppercase tracking-wide text-white">
              <th className="px-5 py-3 font-medium">SL#</th>
              <th className="px-5 py-3 font-medium">Product Code</th>
              <th className="px-5 py-3 font-medium">Product Name</th>
              <th className="px-5 py-3 text-right font-medium">Price</th>
              <th className="px-5 py-3 text-right font-medium">Quantity</th>
              <th className="px-5 py-3 text-right font-medium">Discount</th>
              <th className="px-5 py-3 text-right font-medium">Taxable Amount</th>
              <th className="px-5 py-3 text-right font-medium">Tax Details</th>
              <th className="px-5 py-3 text-right font-medium">Grand Total</th>
              <th className="px-5 py-3 text-right font-medium">{actionColumnLabel}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-8 text-center text-sm text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}

            {items.map((item, index) => (
              <tr key={index} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                <td className="px-5 py-3.5 text-slate-400">{index + 1}</td>
                <td className="px-5 py-3.5">{item.product_code}</td>
                <td className="px-5 py-3.5 font-medium">
                  {item.product_name}
                  {item.free_quantity > 0 && (
                    <span className="ml-1.5 text-xs text-emerald-600">+{item.free_quantity} free</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">{formatCurrency3(item[priceFieldName])}</td>
                <td className="px-5 py-3.5 text-right tabular-nums">
                  {item.quantity} {item.uom || 'pcs'}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">
                  {item.discount_percent > 0 ? `${item.discount_percent}%` : '—'}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">{formatCurrency3(item.taxable_amount)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">
                  {item.is_igst
                    ? `IGST ${item.gst_percent}% (${formatCurrency3(item.igst_amount)})`
                    : `CGST ${(item.gst_percent / 2).toFixed(1)}% + SGST ${(item.gst_percent / 2).toFixed(1)}% (${formatCurrency3(item.gst_amount)})`}
                </td>
                <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                  {formatCurrency3(item.grand_amount)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(index)}
                        aria-label={`Edit ${item.product_name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      aria-label={`Remove ${item.product_name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
