import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Menu } from 'lucide-react'
import logo from './assets/logo.webp'
import RequireAuth from './components/RequireAuth'
import Sidebar from './components/Sidebar'
import UserMenu from './components/UserMenu'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import CategoryPage from './pages/master-settings/CategoryPage'
import CustomerPage from './pages/master-settings/CustomerPage'
import FinancialYearPage from './pages/master-settings/FinancialYearPage'
import PackingSizePage from './pages/master-settings/PackingSizePage'
import ProductPage from './pages/master-settings/ProductPage'
import VendorPage from './pages/master-settings/VendorPage'
import ManagePurchasePage from './pages/purchase/ManagePurchasePage'
import PurchaseEntryPage from './pages/purchase/PurchaseEntryPage'
import PurchaseInvoicePage from './pages/purchase/PurchaseInvoicePage'
import GstReportPage from './pages/reports/GstReportPage'
import StockReportPage from './pages/reports/StockReportPage'
import DeliveryListPage from './pages/sales/DeliveryListPage'
import SalesEntryPage from './pages/sales/SalesEntryPage'
import SalesInvoicePage from './pages/sales/SalesInvoicePage'
import SalesOrderEntryPage from './pages/sales/SalesOrderEntryPage'
import SalesReturnPage from './pages/sales/SalesReturnPage'
import ViewSalesOrderPage from './pages/sales/ViewSalesOrderPage'
import ViewSalesPage from './pages/sales/ViewSalesPage'

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-linear-to-br from-brand-100 via-slate-50 to-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex h-14 items-center gap-3 border-b border-brand-300 bg-white px-4 shadow-sm lg:pl-64 print:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <img src={logo} alt="smartPOS" className="h-8 w-auto lg:hidden" />
        <div className="ml-auto flex items-center gap-3">
          {user?.financial_year && (
            <span className="rounded-full bg-linear-to-r from-brand-500 to-brand-400 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
              FY {user.financial_year}
            </span>
          )}
          <UserMenu />
        </div>
      </div>

      <div className="lg:pl-64 print:pl-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/purchase/manage" element={<ManagePurchasePage />} />
          <Route path="/purchase/entry" element={<PurchaseEntryPage />} />
          <Route path="/purchase/entry/:id" element={<PurchaseEntryPage />} />
          <Route path="/purchase/invoice/:id" element={<PurchaseInvoicePage />} />
          <Route path="/sales/entry" element={<SalesEntryPage />} />
          <Route path="/sales/entry/:id" element={<SalesEntryPage />} />
          <Route path="/sales/view" element={<ViewSalesPage />} />
          <Route path="/sales/invoice/:id" element={<SalesInvoicePage />} />
          <Route path="/sales/order/entry" element={<SalesOrderEntryPage />} />
          <Route path="/sales/order/entry/:id" element={<SalesOrderEntryPage />} />
          <Route path="/sales/order/view" element={<ViewSalesOrderPage />} />
          <Route path="/sales/delivery" element={<DeliveryListPage />} />
          <Route path="/sales/return" element={<SalesReturnPage />} />
          <Route path="/company-profile" element={<Navigate to="/profile-settings" replace />} />
          <Route path="/profile-settings" element={<ProfileSettingsPage />} />
          <Route path="/reports/sales-b2b" element={<GstReportPage reportKey="sales-b2b" />} />
          <Route path="/reports/sales-b2c" element={<GstReportPage reportKey="sales-b2c" />} />
          <Route path="/reports/purchase-gst" element={<GstReportPage reportKey="purchase-gst" />} />
          <Route path="/reports/stock" element={<StockReportPage />} />
          <Route path="/master-settings" element={<Navigate to="/master-settings/categories" replace />} />
          <Route path="/master-settings/categories" element={<CategoryPage />} />
          <Route path="/master-settings/products" element={<ProductPage />} />
          <Route path="/master-settings/packing-sizes" element={<PackingSizePage />} />
          <Route path="/master-settings/vendors" element={<VendorPage />} />
          <Route path="/master-settings/customers" element={<CustomerPage />} />
          <Route path="/master-settings/financial-years" element={<FinancialYearPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/*" element={<AppShell />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
