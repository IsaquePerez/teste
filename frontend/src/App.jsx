import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { AdminUsers } from './pages/AdminUsers';
import './index.css';

// Imports das páginas
import { AdminSistemas } from './pages/AdminSistemas';
import { AdminModulos } from './pages/AdminModulos';
import { AdminProjetos } from './pages/AdminProjetos';
import { AdminCasosTeste } from './pages/AdminCasosTeste';
import { AdminCiclos } from './pages/AdminCiclos';
import { QADefeitos } from './pages/QADefeitos';
import { QARunner } from './pages/QARunner';
import { Dashboard } from './pages/Dashboard'; 

// --- HEADER GLOBAL ---
function TopHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="top-header">
      <nav className="top-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 20px' }}>
        
        {/* --- AQUI É O ALVO DO PORTAL --- */}
        {/* Os botões de "Novo", "Voltar", "Filtros" das páginas aparecerão AQUI magicamente */}
        <div id="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
            {/* Vazio por padrão. As páginas preenchem isso. */}
        </div>

        {/* Lado Direito: Informações do Usuário (Fixo) */}
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

function Sidebar({ role }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className="sidebar">
       <div className="brand-wrap">
         <img src="/logoge.svg" alt="GE" className="brand-logo-ge" />
       </div>
       <div className="brand-wrap">
         <img src="/logoveritus.png" alt="Veritus" className="brand-logo-vt" />
         <div className="brand">Veritus</div>
       </div>
       <nav>
         {/* === VISÃO DO ADMIN === */}
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
         {/* VISÃO DO TESTADOR (EXECUÇÃO) */}
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
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return (
    <div className="app-layout">
      <Sidebar role={user.role} />
      <div className="main-content">
         <TopHeader /> 
         {/* Adicionei padding 20px aqui para o conteúdo não colar na borda */}
         <div style={{ padding: '20px', overflowY: 'auto', height: 'calc(100vh - 60px)' }}> 
            <Outlet />
         </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          
          {/* === ROTAS ADMIN === */}
          <Route element={<ProtectedLayout roles={['admin']} />}>
            {/* 2. Substituir o placeholder pela Dashboard real */}
            <Route path="/admin" element={<Dashboard />} />
            
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/sistemas" element={<AdminSistemas />} />
            <Route path="/admin/modulos" element={<AdminModulos />} />
            <Route path="/admin/projetos" element={<AdminProjetos />} />
            <Route path="/admin/casos" element={<AdminCasosTeste />} />
            <Route path="/admin/ciclos" element={<AdminCiclos />} />
          </Route>

          {/* === ROTAS TESTADOR === */}
          <Route element={<ProtectedLayout roles={['user']} />}>
            <Route path="/qa/runner" element={<QARunner />} />
          </Route>

          {/* === ROTAS COMUNS === */}
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