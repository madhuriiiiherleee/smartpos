import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, ChevronDown, LayoutDashboard, Receipt, Settings, ShoppingCart, UserCog } from 'lucide-react'
import logo from '../assets/logo.webp'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/', end: true },
  { label: 'Purchase', icon: ShoppingCart, to: '/purchase/manage', matchPrefix: '/purchase' },
  {
    label: 'Sales',
    icon: Receipt,
    matchPrefix: '/sales',
    children: [
      { label: 'Sales Entry', to: '/sales/entry' },
      { label: 'View Sales', to: '/sales/view' },
      { label: 'Sales Return', to: '/sales/return' },
    ],
  },
  {
    label: 'Master Settings',
    icon: Settings,
    matchPrefix: '/master-settings',
    children: [
      { label: 'Category', to: '/master-settings/categories' },
      { label: 'Product', to: '/master-settings/products' },
      { label: 'Packing Size', to: '/master-settings/packing-sizes' },
      { label: 'Vendor', to: '/master-settings/vendors' },
      { label: 'Customer', to: '/master-settings/customers' },
      { label: 'Financial Year', to: '/master-settings/financial-years' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    matchPrefix: '/reports',
    children: [
      { label: 'Sales B2B Report', to: '/reports/sales-b2b' },
      { label: 'Sales B2C Report', to: '/reports/sales-b2c' },
      { label: 'Purchase GST Report', to: '/reports/purchase-gst' },
      { label: 'Stock Report', to: '/reports/stock' },
    ],
  },
  { label: 'Profile Settings', icon: UserCog, to: '/profile-settings' },
]

function SimpleLink({ label, icon: Icon, to, end, matchPrefix, location, onNavigate }) {
  const isActive = matchPrefix
    ? location.pathname.startsWith(matchPrefix)
    : end
      ? location.pathname === to
      : location.pathname.startsWith(to)

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={`flex w-full items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-sm font-medium transition ${
        isActive
          ? 'border-brand-500 bg-white text-brand-800 shadow-sm'
          : 'border-transparent text-brand-50/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon size={18} strokeWidth={2} className={isActive ? 'text-brand-600' : ''} />
      {label}
    </NavLink>
  )
}

function ExpandableGroup({ label, icon: Icon, matchPrefix, children, location, onNavigate }) {
  const isActiveGroup = location.pathname.startsWith(matchPrefix)
  const [open, setOpen] = useState(isActiveGroup)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActiveGroup ? 'text-white' : 'text-brand-50/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={18} strokeWidth={2} className={isActiveGroup ? 'text-brand-400' : ''} />
        {label}
        <ChevronDown
          size={15}
          className={`ml-auto transition-transform ${isActiveGroup ? 'text-brand-400' : ''} ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-0.5 border-l border-white/15 pl-6">
          {children.map((child) => {
            const isActive = location.pathname === child.to
            return (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-white font-medium text-brand-800 shadow-sm' : 'text-brand-50/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-brand-500' : 'bg-transparent'}`} />
                {child.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden print:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col overflow-y-auto bg-brand-900 shadow-xl transition-transform duration-200 ease-in-out print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-brand-200 bg-white px-4">
          <img src={logo} alt="smartPOS" className="h-8 w-auto" />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            if (item.children) return <ExpandableGroup key={item.label} {...item} location={location} onNavigate={onClose} />
            return <SimpleLink key={item.label} {...item} location={location} onNavigate={onClose} />
          })}
        </nav>
      </aside>
    </>
  )
}
