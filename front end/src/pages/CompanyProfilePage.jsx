import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { companyProfileApi, extractErrorMessage } from '../api/company'
import { FieldLabel, FormRow, TextArea, TextInput } from '../components/master/FormField'
import { AddressFields } from '../components/master/AddressFields'

function withBase(path) {
  if (!path) return path
  return `${import.meta.env.BASE_URL}${path}`.replace(/\/+/g, '/')
}

const EMPTY_FORM = {
  company_name: '',
  email: '',
  website: '',
  pan: '',
  address_line1: '',
  address_line2: '',
  gstin: '',
  city: '',
  state: '',
  pincode: '',
  contact_no_1: '',
  contact_no_2: '',
  bank_name: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  branch: '',
  invoice_declaration: '',
}

const TABS = [
  { key: 'bank', label: 'Bank Info' },
  { key: 'footnote', label: 'Print/Invoice Footnote' },
]

export default function CompanyProfilePage({ embedded = false }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [logoUrl, setLogoUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('footnote')
  const fileInputRef = useRef(null)

  async function load() {
    setLoading(true)
    try {
      const data = await companyProfileApi.get()
      setForm({ ...EMPTY_FORM, ...data })
      setLogoUrl(data.logo_url)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const data = await companyProfileApi.update(form)
      setForm({ ...EMPTY_FORM, ...data })
      setEditing(false)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setError(null)
    setEditing(false)
    load()
  }

  async function handleLogoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await companyProfileApi.uploadLogo(file)
      setLogoUrl(data.logo_url)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      e.target.value = ''
    }
  }

  async function handleLogoRemove() {
    const data = await companyProfileApi.removeLogo()
    setLogoUrl(data.logo_url)
  }

  if (loading) {
    return <div className="px-6 py-6 text-sm text-slate-400">Loading…</div>
  }

  const mainClassName = embedded ? 'space-y-6' : 'space-y-6 px-6 py-6'

  return (
    <div>
      {!embedded && (
        <header className="border-b border-brand-200 bg-brand-100">
          <div className="px-6 py-5">
            <h1 className="text-lg font-semibold text-slate-800">Company Profile</h1>
            <p className="text-sm text-slate-400">Business details used on invoices and reports</p>
          </div>
        </header>
      )}

      <main className={mainClassName}>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <FormRow cols={2}>
                <div>
                  <FieldLabel required>Company Name</FieldLabel>
                  <TextInput
                    required
                    disabled={!editing}
                    value={form.company_name}
                    onChange={(e) => updateField('company_name', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Email Address</FieldLabel>
                  <TextInput
                    type="email"
                    disabled={!editing}
                    value={form.email ?? ''}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>
              </FormRow>

              <FormRow cols={2}>
                <div>
                  <FieldLabel>Website</FieldLabel>
                  <TextInput
                    disabled={!editing}
                    value={form.website ?? ''}
                    onChange={(e) => updateField('website', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel required>PAN</FieldLabel>
                  <TextInput
                    required
                    disabled={!editing}
                    value={form.pan ?? ''}
                    onChange={(e) => updateField('pan', e.target.value)}
                  />
                </div>
              </FormRow>

              <FormRow cols={2}>
                <div>
                  <FieldLabel required>GSTIN</FieldLabel>
                  <TextInput
                    required
                    disabled={!editing}
                    value={form.gstin}
                    onChange={(e) => updateField('gstin', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel required>Contact No. 1</FieldLabel>
                  <TextInput
                    required
                    disabled={!editing}
                    value={form.contact_no_1}
                    onChange={(e) => updateField('contact_no_1', e.target.value)}
                  />
                </div>
              </FormRow>

              <div>
                <FieldLabel>Contact No. 2</FieldLabel>
                <TextInput
                  disabled={!editing}
                  value={form.contact_no_2 ?? ''}
                  onChange={(e) => updateField('contact_no_2', e.target.value)}
                />
              </div>

              <AddressFields
                required
                disabled={!editing}
                value={form}
                onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              />
            </div>

            <div className="lg:col-span-1">
              <div className="rounded-xl border border-slate-200">
                <p className="border-b border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700">
                  Company Logo
                </p>
                <div className="flex flex-col items-center gap-3 p-5">
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                    {logoUrl ? (
                      <>
                        <img src={withBase(logoUrl)} alt="Company logo" className="h-full w-full rounded-lg object-contain" />
                        {editing && (
                          <button
                            type="button"
                            onClick={handleLogoRemove}
                            className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-slate-500 shadow ring-1 ring-slate-200 hover:text-rose-600"
                            aria-label="Remove logo"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      <ImagePlus size={28} className="text-slate-300" />
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                  <button
                    type="button"
                    disabled={!editing}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <ImagePlus size={15} />
                    Select Image
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <div className="mb-4 flex gap-1 border-b border-slate-100">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                    tab === t.key
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'bank' && (
              <FormRow cols={2}>
                <div>
                  <FieldLabel>Bank Name</FieldLabel>
                  <TextInput
                    disabled={!editing}
                    value={form.bank_name ?? ''}
                    onChange={(e) => updateField('bank_name', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Account Holder Name</FieldLabel>
                  <TextInput
                    disabled={!editing}
                    value={form.account_holder_name ?? ''}
                    onChange={(e) => updateField('account_holder_name', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Account Number</FieldLabel>
                  <TextInput
                    disabled={!editing}
                    value={form.account_number ?? ''}
                    onChange={(e) => updateField('account_number', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>IFSC Code</FieldLabel>
                  <TextInput
                    disabled={!editing}
                    value={form.ifsc_code ?? ''}
                    onChange={(e) => updateField('ifsc_code', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Branch</FieldLabel>
                  <TextInput
                    disabled={!editing}
                    value={form.branch ?? ''}
                    onChange={(e) => updateField('branch', e.target.value)}
                  />
                </div>
              </FormRow>
            )}

            {tab === 'footnote' && (
              <div>
                <FieldLabel>Declaration</FieldLabel>
                <TextArea
                  rows={5}
                  disabled={!editing}
                  value={form.invoice_declaration ?? ''}
                  onChange={(e) => updateField('invoice_declaration', e.target.value)}
                  placeholder="Text printed at the bottom of every invoice"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
              >
                Edit
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
