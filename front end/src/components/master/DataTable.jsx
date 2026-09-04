export default function DataTable({ columns, rows, loading, keyField = 'id', renderCell, actions, emptyMessage }) {
  const colCount = columns.length + (actions ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            {columns.map((col) => (
              <th key={col.key} className={`px-5 py-3 font-medium ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
            {actions && <th className="px-5 py-3 text-right font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  </td>
                ))}
                {actions && (
                  <td className="px-5 py-3.5">
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-100" />
                  </td>
                )}
              </tr>
            ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="px-5 py-8 text-center text-sm text-slate-400">
                {emptyMessage || 'No records found.'}
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row, i) => (
              <tr key={row[keyField]} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-3.5 ${col.className || ''}`}>
                    {renderCell ? renderCell(row, col) : row[col.key]}
                  </td>
                ))}
                {actions && <td className="px-5 py-3.5 text-right">{actions(row)}</td>}
              </tr>
            ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
