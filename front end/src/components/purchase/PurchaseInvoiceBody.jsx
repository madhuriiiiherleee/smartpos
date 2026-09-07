import { formatDDMMYYYY } from '../../lib/format'
import InvoiceBody from '../shared/InvoiceBody'

export default function PurchaseInvoiceBody({ purchase, company }) {
  return (
    <InvoiceBody
      doc={purchase}
      company={company}
      title="Purchase Invoice"
      dateText={formatDDMMYYYY(purchase.purchase_date)}
      partyLabel="Vendor"
      partyName={purchase.supplier_name || '—'}
      priceKey="purchase_price"
      showDiscount
      extraTotalsRows={[
        { label: 'TCS', value: purchase.tcs, show: purchase.tcs > 0 },
        { label: 'Round Off', value: purchase.round_off, show: purchase.round_off !== 0 },
      ]}
    />
  )
}
