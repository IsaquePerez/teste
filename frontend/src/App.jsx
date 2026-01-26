import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import './styles/index.css';
import { NotFound } from './pages/NotFound';
import { ResetPassword } from './pages/ResetPassword';
import { ForgotPassword } from './pages/ForgotPassword';

import { SnackbarProvider } from './context/SnackbarContext';
import { Snackbar } from './components/Snackbar';

import ScrollToTop from './components/ScrollToTop'; 
import { ProtectedLayout } from './components/ProtectedLayout';

import { AdminUsers } from './pages/AdminUsers';
import { AdminSistemas } from './pages/AdminSistemas';
import { AdminModulos } from './pages/AdminModulos';
import { AdminProjetos } from './pages/AdminProjetos';
import { AdminCasosTeste } from './pages/AdminCasosTeste';
import { AdminCiclos } from './pages/AdminCiclos';
import { QADefeitos } from './pages/QADefeitos';
import { QARunner } from './pages/QARunner';
import { Dashboard } from './pages/Dashboard'; 
import { RunnerDashboard } from './pages/RunnerDashboard';

function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <Snackbar />
        
        <BrowserRouter>
          <ScrollToTop />
          
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route element={<ProtectedLayout roles={['admin']} />}>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/sistemas" element={<AdminSistemas />} />
              <Route path="/admin/modulos" element={<AdminModulos />} />
              <Route path="/admin/projetos" element={<AdminProjetos />} />
              <Route path="/projetos/:id" element={<AdminProjetos />} />
              <Route path="/admin/casos" element={<AdminCasosTeste />} />
              <Route path="/admin/ciclos" element={<AdminCiclos />} />
              <Route path="/admin/performance" element={<RunnerDashboard />} />
            </Route>
            
            <Route element={<ProtectedLayout roles={['user']} />}>
              <Route path="/qa/runner" element={<QARunner />} />
            </Route>
            
            <Route element={<ProtectedLayout roles={['user', 'admin']} />}>
              <Route path="/qa/defeitos" element={<QADefeitos />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </AuthProvider>
  );
}

export default App;