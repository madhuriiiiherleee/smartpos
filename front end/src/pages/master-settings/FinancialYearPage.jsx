import { useEffect, useState } from 'react'
import { financialYearsApi, extractErrorMessage } from '../../api/master'
import DataTable from '../../components/master/DataTable'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { FieldLabel, Select } from '../../components/master/FormField'
import { formatDDMMYYYY } from '../../lib/format'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - 5 + i)

export default function FinancialYearPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [startYear, setStartYear] = useState('')
  const [makeActive, setMakeActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setItems(await financialYearsApi.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!startYear) {
      setFormError('Select a start year.')
      return
    }
    setFormError(null)
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    const yearLabel = `${startYear}-${Number(startYear) + 1}`
    try {
      await financialYearsApi.create({ start_year: Number(startYear), make_active: makeActive })
      setStartYear('')
      setMakeActive(true)
      await load()
      setResultDialog({
        variant: 'success',
        title: 'Financial Year Added Successfully',
        message: `Financial year ${yearLabel} has been added successfully.`,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Add Financial Year',
        message: extractErrorMessage(err),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate(id) {
    await financialYearsApi.activate(id)
    await load()
  }

  return (
    <div>
      

      <main className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-3">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Financial Year</h1>
        </div>
      <div className="lg:col-span-1">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5"
        >
          <div>
            <FieldLabel required>Select Start Year</FieldLabel>
            <Select value={startYear} onChange={(e) => setStartYear(e.target.value)} required>
              <option value="">Select Year From</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
            {startYear && (
              <p className="mt-1.5 text-xs text-slate-400">
                {formatDDMMYYYY(`${startYear}-04-01`)} to {formatDDMMYYYY(`${Number(startYear) + 1}-03-31`)}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={makeActive}
              onChange={(e) => setMakeActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-600 focus:ring-brand-400"
            />
            Make it current Financial Year
          </label>

          {formError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2">
        <DataTable
          loading={loading}
          rows={items}
          emptyMessage="No financial years configured."
          columns={[
            { key: 'sl_no', label: 'SL No' },
            { key: 'period', label: 'Financial Year' },
            { key: 'is_active', label: 'Status' },
          ]}
          renderCell={(row, col) => {
            if (col.key === 'sl_no') return items.indexOf(row) + 1
            if (col.key === 'period') return `${formatDDMMYYYY(row.start_date)} to ${formatDDMMYYYY(row.end_date)}`
            if (col.key === 'is_active') {
              return (
                <span className={row.is_active ? 'font-medium text-emerald-600' : 'font-medium text-brand-600'}>
                  {row.is_active ? 'Active' : 'Inactive'}
                </span>
              )
            }
            return row[col.key]
          }}
          actions={(row) =>
            !row.is_active && (
              <button
                type="button"
                onClick={() => handleActivate(row.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
              >
                Make Active
              </button>
            )
          }
        />
      </div>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="Add Financial Year?"
        message={`Are you sure you want to add financial year ${startYear}-${Number(startYear) + 1}${
          makeActive ? ' and make it the current year' : ''
        }?`}
        confirmLabel="Save"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSave}
        busy={saving}
      />
      <AlertDialog
        open={resultDialog != null}
        variant={resultDialog?.variant ?? 'success'}
        title={resultDialog?.title ?? ''}
        message={resultDialog?.message ?? ''}
        onClose={() => setResultDialog(null)}
      />
    </div>
  )
}
