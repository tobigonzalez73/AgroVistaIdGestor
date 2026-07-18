import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ChatProvider } from './context/ChatContext';
import { FinanceProvider } from './context/FinanceContext';
import { GeoProvider } from './context/GeoContext';
import { TreasuryProvider } from './context/TreasuryContext';
import { InventoryProvider } from './context/InventoryContext';
import { TaskProvider } from './context/TaskContext';
import { UserProvider } from './context/UserContext';
import { AuditProvider } from './context/AuditContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Ensayos from './pages/Ensayos';
import Finances from './pages/Finances';
import GeoCatalog from './pages/GeoCatalog';
import ProductCatalog from './pages/ProductCatalog';
import Aplicaciones from './pages/Aplicaciones';
import Treasury from './pages/Treasury';
import Login from './pages/Login';
import PendingApproval from './pages/PendingApproval';
import { Accounting } from './pages/Accounting';
import Tasks from './pages/Tasks';
import Comprobantes from './pages/Comprobantes';
import Settings from './pages/Settings';
import UsersPage from './pages/Users';

import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';

// RecoveryScript removed for production

function App() {

  return (
    <UserProvider>
      <NotificationProvider>
        <SettingsProvider>
          <AuditProvider>
            <AppProvider>
            <ChatProvider>
              <FinanceProvider>
                <GeoProvider>
                  <TreasuryProvider>
                    <InventoryProvider>
                      <TaskProvider>
                        {/* RecoveryScript removed */}
                        <Router>

                          <Routes>
                            <Route path="/login" element={<Login />} />
                <Route path="/pending" element={<PendingApproval />} />
                
                {/* Protected Routes */}
                            <Route element={<ProtectedRoute />}>
                              <Route element={<Layout><Outlet /></Layout>}>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/ensayos" element={<Ensayos />} />
                                <Route path="/aplicaciones" element={<Aplicaciones />} />
                                <Route path="/finanzas" element={<Finances />} />
                                <Route path="/tesoreria" element={<Treasury />} />
                                <Route path="/contabilidad" element={<Accounting />} />
                                <Route path="/catalogos/geo" element={<GeoCatalog />} />
                                <Route path="/catalogos/productos" element={<ProductCatalog />} />
                                <Route path="/tareas" element={<Tasks />} />
                                <Route path="/comprobantes" element={<Comprobantes />} />
                                <Route path="/usuarios" element={<UsersPage />} />
                                <Route path="/configuracion" element={<Settings />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                              </Route>
                            </Route>
                          </Routes>
                        </Router>
                      </TaskProvider>
                    </InventoryProvider>
                  </TreasuryProvider>
                </GeoProvider>
              </FinanceProvider>
            </ChatProvider>
          </AppProvider>
        </AuditProvider>
      </SettingsProvider>
      </NotificationProvider>
    </UserProvider>
  );
}

export default App;
