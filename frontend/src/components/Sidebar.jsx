import { Link, useLocation } from 'react-router-dom';

export function Sidebar({ role, isOpen, closeSidebar }) {
  const location = useLocation();
  
  // Verifica se a rota atual corresponde ao link para marcar como ativo
  const isActive = (path) => location.pathname === path ? 'active' : '';
  
  // Fecha a sidebar automaticamente ao clicar em um link (se estiver em mobile)
  const handleNavClick = () => { 
    if (window.innerWidth < 768) {
      closeSidebar(); 
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Organização da logo vinda da Main (muda conforme o cargo) */}
        {role === 'admin' && (
          <Link to="/admin" onClick={handleNavClick}>
            <div className="brand-wrap">
              <img src="/logoge.svg" alt="GE" className="brand-logo-ge" />
            </div>
          </Link>
        )}
        {role === 'user' && (
          <Link to="/qa/runner" onClick={handleNavClick}>
            <div className="brand-wrap">
              <img src="/logoge.svg" alt="GE" className="brand-logo-ge" />
            </div>
          </Link>
        )}

        <nav onClick={handleNavClick}>
          {role === 'admin' && (
            <>
              <div className="nav-section">ADMINISTRAÇÃO</div>
              <Link to="/admin" className={isActive('/admin')}>Dashboard: Execution</Link>
              
              <Link to="/admin/performance" className={isActive('/admin/performance')}>Dashboard: QA Team</Link>
              
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