import { Link, useLocation } from 'react-router-dom';
import { Chevron } from './icons/Chevron';
import { useEffect, useState } from 'react';

export function Sidebar({ role, isOpen, closeSidebar }) {
  const location = useLocation();

  const isDashboardsActive = location.pathname === '/admin' || location.pathname === '/admin/performance';

  const [isDashboardsOpen, setIsDashboardsOpen] = useState(isDashboardsActive);

  useEffect(() => {
    if (isDashboardsActive) {
      setIsDashboardsOpen(true);
    } else {
      setIsDashboardsOpen(false);
    }
  }, [isDashboardsActive]);
  
  const isActive = (path) => location.pathname === path ? 'active' : '';

  const toggleDashboards = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    setIsDashboardsOpen(!isDashboardsOpen);
  };
  
  const handleNavClick = () => { 
    if (window.innerWidth < 768) {
      closeSidebar(); 
    }
  };

  const handleExternalClick = () => {
    setIsDashboardsOpen(false);
    handleNavClick();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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

              <div
                className="nav-item-parent"
                onClick={toggleDashboards}
              >
                <span>Paineis</span>
                <Chevron isOpen={isDashboardsOpen} />
              </div>

              {isDashboardsOpen && (
                <div className="nav-submenu">
                  <Link to="/admin" className={isActive('/admin')}>Execução</Link>
                  <Link to="/admin/performance" className={isActive('/admin/performance')}>Time de Testadores</Link>
                </div>
              )}
              
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