import ItemForm from '../shared/ItemForm'

export default function PurchaseItemForm({ onAdd, editingItem = null, onUpdate = null, onCancelEdit = null }) {
  return (
    <ItemForm
      onAdd={onAdd}
      editingItem={editingItem}
      onUpdate={onUpdate}
      onCancelEdit={onCancelEdit}
      priceFieldName="purchase_price"
      priceLabel="Purchase Price / Piece"
      priceErrorMsg="Enter a valid Purchase Price / Piece."
      barcodePlaceholder="Scan or type code"
      barcodeNotFoundMsg="No product found for that barcode/code."
      detailGridCols="xl:grid-cols-8"
      autoFillPriceOnDetailChange
      enableIgst
    />
  )
}
