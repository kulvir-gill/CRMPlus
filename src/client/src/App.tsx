import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Contacts from './pages/Contacts'
import Activities from './pages/Activities'
import Projects from './pages/Projects'
import WorkItems from './pages/WorkItems'
import Timesheets from './pages/Timesheets'
import Products from './pages/Products'
import Quotes from './pages/Quotes'
import Invoices from './pages/Invoices'
import Users from './pages/Users'
import Teams from './pages/Teams'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/work-items" element={<WorkItems />} />
            <Route path="/timesheets" element={<Timesheets />} />
            <Route path="/products" element={<Products />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/users" element={<Users />} />
            <Route path="/teams" element={<Teams />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
