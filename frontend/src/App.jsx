import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import './styles/index.css';

import ScrollToTop from './components/ScrollToTop'; 

import { AdminUsers } from './pages/AdminUsers';
import { AdminSistemas } from './pages/AdminSistemas';
import { AdminModulos } from './pages/AdminModulos';
import { AdminProjetos } from './pages/AdminProjetos';
import { AdminCasosTeste } from './pages/AdminCasosTeste';
import { AdminCiclos } from './pages/AdminCiclos';
import { QADefeitos } from './pages/QADefeitos';
import { QARunner } from './pages/QARunner';
import { Dashboard } from './pages/Dashboard'; 

function TopHeader({ toggleSidebar }) {
  const { user, logout } = useAuth();
  return (
    <header className="top-header" style={{
        height: '64px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', flexShrink: 0, zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="btn-mobile-menu" onClick={toggleSidebar} title="Abrir Menu">☰</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#eef2ff', 
              color: '#3730a3', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e7ff'
          }}>
              <span style={{fontWeight: 600, fontSize: '0.9rem'}}>{user?.nome || 'Usuário'}</span>
          </div>
          <button onClick={logout} className="btn danger" style={{padding: '6px 16px', fontSize: '0.85rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px'}}>
             Sair
          </button>
      </div>
    </header>
  );
}

function Sidebar({ role, isOpen, closeSidebar }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';
  const handleNavClick = () => { if (window.innerWidth < 768) closeSidebar(); };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
       <div className="brand-wrap"><img src="/logoge.svg" alt="GE" className="brand-logo-ge" /></div>
       <div className="brand-wrap" style={{borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px'}}>
         <img src="/logoveritus.png" alt="Veritus" className="brand-logo-vt" /><div className="brand">Veritus</div>
       </div>
       <nav onClick={handleNavClick}>
         {role === 'admin' && (
           <>
             <div className="nav-section">ADMINISTRAÇÃO</div>
             <Link to="/admin" className={isActive('/admin')}>Dashboard Hub</Link>
             <Link to="/admin/users" className={isActive('/admin/users')}>Acessos</Link>
             <div className="nav-section">ESTRUTURA</div>
             <Link to="/admin/sistemas" className={isActive('/admin/sistemas')}>Sistemas</Link>
             <Link to="/admin/modulos" className={isActive('/admin/modulos')}>Módulos</Link>
             <Link to="/admin/projetos" className={isActive('/admin/projetos')}>Projetos</Link>
             <div className="nav-section">PLANEJAMENTO</div>
             <Link to="/admin/ciclos" className={isActive('/admin/ciclos')}>Ciclos</Link>
             <Link to="/admin/casos" className={isActive('/admin/casos')}>Casos de Testes</Link>
             <div className="nav-section">MONITORAMENTO</div>
             <Link to="/qa/defeitos" className={isActive('/qa/defeitos')}>Gestão de Defeitos</Link>
           </>
         )}
         {role === 'user' && (
           <>
              <div className="nav-section">MINHA ÁREA</div>
              <Link to="/qa/runner" className={isActive('/qa/runner')}>Minhas Tarefas</Link>
              <div className="nav-section">QUALIDADE</div>
              <Link to="/qa/defeitos" className={isActive('/qa/defeitos')}>Meus Reportes</Link>
           </>
         )}
       </nav>
    </aside>
  );
}

function ProtectedLayout({ roles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Carregando...</div>;
  if (!isAuthenticated || !user) return <Navigate to="/" replace />;
  
  const userRole = user.role || user.nivel_acesso?.nome || 'user'; 
  if (roles && !roles.includes(userRole)) return <Navigate to="/" replace />;

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      <Sidebar role={userRole} isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      
      <div className="main-content" style={{backgroundColor: '#F3F4F6'}}>
         <TopHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} /> 
         
         <div 
            id="main-content-scroll" 
            style={{ padding: '30px', overflowY: 'auto', height: 'calc(100vh - 64px)' }}
         > 
            <Outlet />
         </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <ScrollToTop />
        
        <Routes>
          <Route path="/" element={<Login />} />
          
          <Route element={<ProtectedLayout roles={['admin']} />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/sistemas" element={<AdminSistemas />} />
            <Route path="/admin/modulos" element={<AdminModulos />} />
            <Route path="/admin/projetos" element={<AdminProjetos />} />
            <Route path="/admin/casos" element={<AdminCasosTeste />} />
            <Route path="/admin/ciclos" element={<AdminCiclos />} />
          </Route>
          
          <Route element={<ProtectedLayout roles={['user']} />}>
            <Route path="/qa/runner" element={<QARunner />} />
          </Route>
          
          <Route element={<ProtectedLayout roles={['user', 'admin']} />}>
            <Route path="/qa/defeitos" element={<QADefeitos />} />
          </Route>
          
           <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;