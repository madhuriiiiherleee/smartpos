import { salesApi } from '../../api/sales'
import ItemForm from '../shared/ItemForm'

export default function SalesItemForm({
  customerMargin = 0,
  onAdd,
  excludeSaleId,
  editingItem = null,
  onUpdate = null,
  onCancelEdit = null,
}) {
  return (
    <ItemForm
      onAdd={onAdd}
      editingItem={editingItem}
      onUpdate={onUpdate}
      onCancelEdit={onCancelEdit}
      priceFieldName="price"
      priceLabel="Price / Piece"
      detailGridCols="xl:grid-cols-7"
      customerMargin={customerMargin}
      excludeSaleId={excludeSaleId}
      availableQtyFn={(productDetailId) =>
        salesApi.availableQuantity(productDetailId, excludeSaleId).then((res) => res.available_quantity)
      }
      preserveOnReset={['uom', 'gst_percent']}
    />
  )
}
