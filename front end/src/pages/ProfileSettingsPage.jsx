import { useEffect, useState } from 'react'
import { changePassword, createUser, fetchUsers } from '../api/auth'
import { extractErrorMessage } from '../api/utils'
import { FieldLabel, TextInput } from '../components/master/FormField'
import AlertDialog from '../components/shared/AlertDialog'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import CompanyProfilePage from './CompanyProfilePage'

const TABS = [
  { key: 'password', label: 'Change Password' },
  { key: 'users', label: 'Users' },
  { key: 'company', label: 'Company Profile' },
]

function ChangePasswordTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setResultDialog({
        variant: 'success',
        title: 'Password Updated Successfully',
        message: 'Your password has been changed successfully.',
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Update Password',
        message: extractErrorMessage(err),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          {success}
        </div>
      )}

      <div>
        <FieldLabel required>Current Password</FieldLabel>
        <TextInput
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <FieldLabel required>New Password</FieldLabel>
        <TextInput
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div>
        <FieldLabel required>Confirm New Password</FieldLabel>
        <TextInput
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Update Password?"
        message="Are you sure you want to update your password?"
        confirmLabel="Update"
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
    </form>
  )
}

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setUsers(await fetchUsers())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setConfirmOpen(true)
  }

  async function doAddUser() {
    setConfirmOpen(false)
    setSaving(true)
    const userName = username.trim()
    try {
      await createUser(username, password)
      setUsername('')
      setPassword('')
      await load()
      setResultDialog({
        variant: 'success',
        title: 'User Added Successfully',
        message: `User "${userName}" has been added successfully.`,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Add User',
        message: extractErrorMessage(err),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Existing Users</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-brand-600 text-xs uppercase tracking-wide text-white">
                <th className="px-4 py-2.5 font-medium">SL #</th>
                <th className="px-4 py-2.5 font-medium">Username</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-400">
                    No users found.
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u, i) => (
                  <tr key={u.id} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">{i + 1}</td>
                    <td className="px-4 py-2.5">{u.username}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Add User</h2>
        <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}
          <div>
            <FieldLabel required>Username</FieldLabel>
            <TextInput required value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <FieldLabel required>Password</FieldLabel>
            <TextInput
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add User'}
            </button>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            title="Add User?"
            message={`Are you sure you want to add user "${username.trim() || ''}"?`}
            confirmLabel="Add"
            onCancel={() => setConfirmOpen(false)}
            onConfirm={doAddUser}
            busy={saving}
          />
          <AlertDialog
            open={resultDialog != null}
            variant={resultDialog?.variant ?? 'success'}
            title={resultDialog?.title ?? ''}
            message={resultDialog?.message ?? ''}
            onClose={() => setResultDialog(null)}
          />
        </form>
      </div>
    </div>
  )
}

export default function ProfileSettingsPage() {
  const [tab, setTab] = useState('password')

  return (
    <div>
      

      <main className="space-y-6 px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Profile Settings</h1>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
          <div className={`flex gap-1 border-b border-slate-100 ${tab === 'company' ? '' : 'mb-6'}`}>
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

          {tab === 'password' && <ChangePasswordTab />}
          {tab === 'users' && <UsersTab />}
        </div>

        {tab === 'company' && <CompanyProfilePage embedded />}
      </main>
    </div>
  )
}
