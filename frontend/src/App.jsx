import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { AdminUsers } from './pages/AdminUsers';
import { AdminSistemas } from './pages/AdminSistemas';
import { AdminModulos } from './pages/AdminModulos';
import { AdminProjetos } from './pages/AdminProjetos';
import { AdminCasosTeste } from './pages/AdminCasosTeste';
import { AdminCiclos } from './pages/AdminCiclos';
import { QADefeitos } from './pages/QADefeitos';
import { QARunner } from './pages/QARunner';
import { Dashboard } from './pages/Dashboard'; 
import './index.css';

/* ==========================================================================
   COMPONENTE: CABEÇALHO SUPERIOR (TOP HEADER)
   ========================================================================== */
function TopHeader({ toggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="top-header">
      <nav className="top-actions">
        
        {/* Área Esquerda: Menu Mobile e Portal de Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
            
            {/* Botão de Menu Mobile (Visível apenas em telas pequenas via CSS) */}
            <button 
                className="btn-mobile-menu"
                onClick={toggleSidebar}
                title="Abrir Menu"
            >
                ☰
            </button>

            {/* Portal Target: Botões de ação das páginas são renderizados aqui */}
            <div id="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                {/* Vazio por padrão */}
            </div>
        </div>

        {/* Área Direita: Informações do Usuário */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span className="badge" style={{backgroundColor: '#eef2ff', color: '#3730a3'}}>
                {user?.nome}
            </span>
            <button onClick={logout} className="btn danger" style={{padding: '5px 15px', fontSize: '0.85rem'}}>
                Sair
            </button>
        </div>
      </nav>
    </header>
  );
}

/* ==========================================================================
   COMPONENTE: BARRA LATERAL (SIDEBAR)
   ========================================================================== */
function Sidebar({ role, isOpen, closeSidebar }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  // Fecha o sidebar ao clicar em um link (Melhoria de UX Mobile)
  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
       <div className="brand-wrap">
         <img src="/logoge.svg" alt="GE" className="brand-logo-ge" />
       </div>
       <div className="brand-wrap" style={{borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px'}}>
         <img src="/logoveritus.png" alt="Veritus" className="brand-logo-vt" />
         <div className="brand">Veritus</div>
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

/* ==========================================================================
   LAYOUT PROTEGIDO: GERENCIA ESTADO DE AUTENTICAÇÃO E SIDEBAR
   ========================================================================== */
function ProtectedLayout({ roles }) {
  const { user, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return (
    <div className="app-layout">
      {/* Overlay Escuro para Mobile */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      <Sidebar 
        role={user.role} 
        isOpen={isSidebarOpen}
        closeSidebar={() => setIsSidebarOpen(false)}
      />
      
      <div className="main-content">
         <TopHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} /> 
         
         <div style={{ padding: '20px', overflowY: 'auto', height: 'calc(100vh - 64px)' }}> 
            <Outlet />
         </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   COMPONENTE PRINCIPAL (ROOT)
   ========================================================================== */
function App() {
  return (
    <AuthProvider>
      {/* Componente Global de Notificações (Toasts) */}
      <Toaster richColors position="top-right" />
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          
          {/* Rotas de Administrador */}
          <Route element={<ProtectedLayout roles={['admin']} />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/sistemas" element={<AdminSistemas />} />
            <Route path="/admin/modulos" element={<AdminModulos />} />
            <Route path="/admin/projetos" element={<AdminProjetos />} />
            <Route path="/admin/casos" element={<AdminCasosTeste />} />
            <Route path="/admin/ciclos" element={<AdminCiclos />} />
          </Route>
          
          {/* Rotas de Testador (User) */}
          <Route element={<ProtectedLayout roles={['user']} />}>
            <Route path="/qa/runner" element={<QARunner />} />
          </Route>
          
          {/* Rotas Comuns */}
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