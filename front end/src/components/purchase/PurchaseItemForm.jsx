import ItemForm from '../shared/ItemForm'

export default function PurchaseItemForm({ onAdd, editingItem = null, onUpdate = null, onCancelEdit = null }) {
  return (
    <ItemForm
      onAdd={onAdd}
      editingItem={editingItem}
      onUpdate={onUpdate}
      onCancelEdit={onCancelEdit}
      priceFieldName="purchase_price"
      priceLabel="Price"
      priceErrorMsg="Enter a valid Price."
      barcodePlaceholder="Scan or type code"
      barcodeNotFoundMsg="No product found for that barcode/code."
      detailGridCols="xl:grid-cols-7"
      autoFillPriceOnDetailChange
      enableIgst
      hideLooseUnits
      pricePerBox
    />
  )
}
