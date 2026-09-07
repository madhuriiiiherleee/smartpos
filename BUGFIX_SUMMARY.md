# smartPOS — Bug Fix & Cleanup Summary

## Bugs fixed (impact on business)

### Financial / GST correctness

| Bug | What was wrong | Business impact |
|---|---|---|
| GST-inclusive price import | `price_inc_gst` wasn't saved/used on purchase & sales import; price treated as non-GST | Cost, profit, and GST figures booked wrong on imported entries |
| Sales return credit | Returns didn't fully credit taxable + GST to customer balance | Customer money owed shown incorrectly |
| GST report | Interstate (IGST) amounts missing from exports; total row one column short | Wrong GST liability reported to authorities |
| Dashboard balance | Live receivables/payables computed stale/incorrectly | Wrong cash position shown on dashboard |
| Financial-year resolution | Two quick entries could book into wrong financial year | Transactions counted under wrong year in GST/FY reports |
| Sales-edit after returns | Editing an invoice whose items were already returned could corrupt return records | Return history/stock mismatch |

### Operational bugs

| Bug | What was wrong | Business impact |
|---|---|---|
| Available-qty on edit | Stock check counted the current invoice's own items → false "insufficient stock" | Couldn't edit/save an invoice |
| Barcode stale-lookup | Fast scans could add the previous (wrong) product | Wrong items added to purchase/sales |
| Delivery mark header | Clicking "mark delivered" after filtering marked wrong rows | Wrong deliveries flagged as delivered |
| Wholesale/TCD price | Low-rate price field not saved → items entered at wrong price | Wrong wholesale billing |
| Delete on last page | Deleting the only row of the last page → blank/crash | Couldn't browse after delete |
| Sales-order date | Used UTC → invoice date 1 day behind IST | Wrong date on orders/invoices |
| Login redirect | Query string dropped → didn't return to intended page after login | Extra clicks/navigation confusion |
| Logout on fail | Failed password change still logged user out | User locked out on a failed action |

## Fixed today

1. **Unified Sales vs Purchase code** (no more 2-2 copies): item add form, item table, invoice body now single shared component → fewer places for bugs to hide; also standardized GST slabs, date/params/error helpers.
2. **Incidental bug fixes from the merge:**
   - Sales item form stale barcode bug — same one purchase had — now fixed in the shared form
   - Sales boxes input now sanitized like purchase's
   - UTC date bug on sales-order entry fixed by sharing one local-time `today()`
3. **Popup styling overhaul** — all popups now have the new header/footer colors (single shared modal component, so it stays consistent everywhere).