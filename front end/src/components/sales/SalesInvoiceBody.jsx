import InvoiceBody from '../shared/InvoiceBody'
import { formatDDMMYYYY } from '../../lib/format'

export default function SalesInvoiceBody({ sale, company }) {
  return (
    <InvoiceBody
      doc={sale}
      company={company}
      title="Tax Invoice"
      dateText={formatDDMMYYYY(sale.sale_date)}
      partyLabel="Bill To"
      partyName={sale.customer_name}
      partyAttn={sale.shipping_name ? `Attn: ${sale.shipping_name}` : null}
      rightLines={sale.state_of_supply ? [`State of Supply: ${sale.state_of_supply}`] : []}
      priceKey="price"
      showRetailPrice
      declaration={company?.invoice_declaration}
    />
  )
}
