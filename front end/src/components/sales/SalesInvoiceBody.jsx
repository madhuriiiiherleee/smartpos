import { useEffect, useState } from 'react'
import { salesReturnsApi } from '../../api/sales'
import InvoiceBody from '../shared/InvoiceBody'
import { formatDDMMYYYY } from '../../lib/format'

export default function SalesInvoiceBody({ sale, company }) {
  const [returnedByItem, setReturnedByItem] = useState({})

  useEffect(() => {
    if (!sale?.id) return
    salesReturnsApi.returnableItems(sale.id).then((items) => {
      const map = {}
      items.forEach((i) => {
        map[i.sale_item_id] = i.already_returned_quantity
      })
      setReturnedByItem(map)
    })
  }, [sale?.id])

  const hasReturns = Object.values(returnedByItem).some((qty) => qty > 0)

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
      returnedByItem={returnedByItem}
      hasReturns={hasReturns}
      declaration={company?.invoice_declaration}
    />
  )
}
