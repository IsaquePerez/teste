import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { AdminUsers } from './pages/AdminUsers';
import './index.css';

// Imports das páginas
import { AdminSistemas } from './pages/AdminSistemas';
import { AdminModulos } from './pages/AdminModulos';
import { AdminProjetos } from './pages/AdminProjetos';
import { QACasosTeste } from './pages/QACasosTeste';
import { QACiclos } from './pages/QACiclos';
import { QARunner } from './pages/QARunner';
import { QADefeitos } from './pages/QADefeitos';

function TopHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="top-header">
      <nav className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
        {/* Botão Voltar apenas se necessário, ou removido para dashboard principal */}
        <div style={{ marginRight: 'auto' }}></div> 

        <span style={{ fontWeight: 500 }}>{user?.username}</span>
        <span className="badge" style={{backgroundColor: '#eef2ff', color: '#3730a3'}}>
            {user?.role === 'admin' ? 'Gerente (Admin)' : 'Testador (QA)'}
        </span>
        <button onClick={logout} className="btn danger">Sair</button>
      </nav>
    </header>
  );
}

// --- SIDEBAR INTELIGENTE ---
function Sidebar({ role }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className="sidebar">
       <div className="brand-wrap">
         <img src="/logoge.png" alt="GE" className="brand-logo" />
         <div className="brand">Test Manager</div>
       </div>
       <nav>
         {/* === VISÃO DO ADMIN (PLANEJAMENTO) === */}
         {role === 'admin' && (
           <>
             <div className="nav-section">ADMINISTRAÇÃO</div>
             <Link to="/admin" className={isActive('/admin')}>Dashboard Hub</Link>
             <Link to="/admin/users" className={isActive('/admin/users')}>Acessos</Link>
             
             <div className="nav-section">ESTRUTURA</div>
             <Link to="/admin/sistemas" className={isActive('/admin/sistemas')}>Sistemas</Link>
             <Link to="/admin/modulos" className={isActive('/admin/modulos')}>Módulos</Link>
             <Link to="/admin/projetos" className={isActive('/admin/projetos')}>Projetos</Link>

             <div className="nav-section">QA - PLANEJAMENTO</div>
             <Link to="/qa/casos" className={isActive('/qa/casos')}>Biblioteca de Testes</Link>
             <Link to="/qa/ciclos" className={isActive('/qa/ciclos')}>Criar Ciclos</Link>
             
             {/* Admin vê Defeitos para acompanhar, mas não executa testes */}
             <div className="nav-section">QA - MONITORAMENTO</div>
             <Link to="/qa/defeitos" className={isActive('/qa/defeitos')}>Gestão de Defeitos</Link>
           </>
         )}
         
         {/* === VISÃO DO TESTADOR (EXECUÇÃO) === */}
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
         <div style={{ padding: '0' }}> 
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
          
          {/* === ROTAS EXCLUSIVAS DO ADMIN === */}
          <Route element={<ProtectedLayout roles={['admin']} />}>
            <Route path="/admin" element={<div className="container"><h2 className="section-title">Hub Gerencial</h2><p>Selecione um módulo para gerenciar.</p></div>} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/sistemas" element={<AdminSistemas />} />
            <Route path="/admin/modulos" element={<AdminModulos />} />
            <Route path="/admin/projetos" element={<AdminProjetos />} />
            
            <Route path="/qa/casos" element={<QACasosTeste />} />
            <Route path="/qa/ciclos" element={<QACiclos />} />
          </Route>

          {/* === ROTAS EXCLUSIVAS DO TESTADOR === */}
          <Route element={<ProtectedLayout roles={['user']} />}>
            <Route path="/qa/runner" element={<QARunner />} />
          </Route>

          {/* === ROTAS COMUNS (Visíveis para ambos, mas com contextos diferentes) === */}
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