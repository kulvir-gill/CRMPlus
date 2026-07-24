import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UnsavedChangesProvider } from './context/UnsavedChangesContext'
import { AlertProvider } from './context/AlertContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { modules } from './config/modules'
import Login from './pages/Login'
import ModuleDashboard from './pages/ModuleDashboard'
import Accounts from './pages/Accounts'
import AccountDetail from './pages/AccountDetail'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import Activities from './pages/Activities'
import Projects from './pages/Projects'
import WorkItems from './pages/WorkItems'
import Scheduler from './pages/Scheduler'
import Timesheets from './pages/Timesheets'
import TimesheetNew from './pages/TimesheetNew'
import TimesheetDetail from './pages/TimesheetDetail'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Vendors from './pages/Vendors'
import VendorDetail from './pages/VendorDetail'
import Quotes from './pages/Quotes'
import QuoteDetail from './pages/QuoteDetail'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Teams from './pages/Teams'
import TeamDetail from './pages/TeamDetail'
import SecurityRoles from './pages/SecurityRoles'
import QuoteSettings from './pages/QuoteSettings'

function ModuleGuard({ module }: { module: string }) {
  const { user } = useAuth()
  return user?.modules?.includes(module) ? <Outlet /> : <Navigate to="/" replace />
}

function RootRedirect() {
  const { user } = useAuth()
  const firstModule = modules.find((m) => user?.modules?.includes(m.key))
  return <Navigate to={firstModule ? `/${firstModule.key}` : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <UnsavedChangesProvider>
          <AlertProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<RootRedirect />} />

                <Route element={<ModuleGuard module="crm" />}>
                  <Route path="/crm" element={<ModuleDashboard module="crm" />} />
                  <Route path="/crm/accounts" element={<Accounts />} />
                  <Route path="/crm/accounts/new" element={<AccountDetail />} />
                  <Route path="/crm/accounts/:id" element={<AccountDetail />} />
                  <Route path="/crm/contacts" element={<Contacts />} />
                  <Route path="/crm/contacts/new" element={<ContactDetail />} />
                  <Route path="/crm/contacts/:id" element={<ContactDetail />} />
                  <Route path="/crm/activities" element={<Activities />} />
                </Route>

                <Route element={<ModuleGuard module="sales" />}>
                  <Route path="/sales" element={<ModuleDashboard module="sales" />} />
                  <Route path="/sales/quotes" element={<Quotes />} />
                  <Route path="/sales/quotes/new" element={<QuoteDetail />} />
                  <Route path="/sales/quotes/:id" element={<QuoteDetail />} />
                  <Route path="/sales/orders" element={<Orders />} />
                  <Route path="/sales/orders/new" element={<OrderDetail />} />
                  <Route path="/sales/orders/:id" element={<OrderDetail />} />
                  <Route path="/sales/invoices" element={<Invoices />} />
                  <Route path="/sales/invoices/new" element={<InvoiceDetail />} />
                  <Route path="/sales/invoices/:id" element={<InvoiceDetail />} />
                </Route>

                <Route element={<ModuleGuard module="inventory" />}>
                  <Route path="/inventory" element={<ModuleDashboard module="inventory" />} />
                  <Route path="/inventory/products" element={<Products />} />
                  <Route path="/inventory/products/new" element={<ProductDetail />} />
                  <Route path="/inventory/products/:id" element={<ProductDetail />} />
                  <Route path="/inventory/vendors" element={<Vendors />} />
                  <Route path="/inventory/vendors/new" element={<VendorDetail />} />
                  <Route path="/inventory/vendors/:id" element={<VendorDetail />} />
                </Route>

                <Route element={<ModuleGuard module="resource" />}>
                  <Route path="/resource" element={<ModuleDashboard module="resource" />} />
                  <Route path="/resource/projects" element={<Projects />} />
                  <Route path="/resource/work-items" element={<WorkItems />} />
                  <Route path="/resource/scheduler" element={<Scheduler />} />
                  <Route path="/resource/timesheets" element={<Timesheets />} />
                  <Route path="/resource/timesheets/new" element={<TimesheetNew />} />
                  <Route path="/resource/timesheets/:id" element={<TimesheetDetail />} />
                  <Route path="/resource/teams" element={<Teams />} />
                  <Route path="/resource/teams/new" element={<TeamDetail />} />
                  <Route path="/resource/teams/:id" element={<TeamDetail />} />
                </Route>

                <Route element={<ModuleGuard module="setting" />}>
                  <Route path="/setting" element={<ModuleDashboard module="setting" />} />
                  <Route path="/setting/users" element={<Users />} />
                  <Route path="/setting/users/new" element={<UserDetail />} />
                  <Route path="/setting/users/:id" element={<UserDetail />} />
                  <Route path="/setting/teams" element={<Teams />} />
                  <Route path="/setting/teams/new" element={<TeamDetail />} />
                  <Route path="/setting/teams/:id" element={<TeamDetail />} />
                  <Route path="/setting/security-roles" element={<SecurityRoles />} />
                  <Route path="/setting/admin-setting" element={<QuoteSettings />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AlertProvider>
        </UnsavedChangesProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
