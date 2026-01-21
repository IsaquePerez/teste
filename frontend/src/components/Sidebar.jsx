import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ role, isOpen, closeSidebar }) {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <button className="close-btn" onClick={closeSidebar}>×</button>
        <h3>Menu</h3>
      </div>

      <nav className="sidebar-nav">
        {role === 'admin' && (
          <>
            <Link to="/admin" className={`menu-item ${isActive('/admin')}`}>
              <span>Dashboard</span>
            </Link>
            <Link to="/admin/users" className={`menu-item ${isActive('/admin/users')}`}>
              <span>Usuários</span>
            </Link>
            <Link to="/admin/sistemas" className={`menu-item ${isActive('/admin/sistemas')}`}>
              <span>Sistemas</span>
            </Link>
            <Link to="/admin/modulos" className={`menu-item ${isActive('/admin/modulos')}`}>
              <span>Módulos</span>
            </Link>
            <Link to="/admin/projetos" className={`menu-item ${isActive('/admin/projetos')}`}>
              <span>Projetos</span>
            </Link>
            <Link to="/admin/casos" className={`menu-item ${isActive('/admin/casos')}`}>
              <span>Casos de Teste</span>
            </Link>
            <Link to="/admin/ciclos" className={`menu-item ${isActive('/admin/ciclos')}`}>
              <span>Ciclos</span>
            </Link>
            <Link to="/admin/performance" className={`menu-item ${isActive('/admin/performance')}`}>
              <span>Performance</span>
            </Link>
          </>
        )}
        {(role === 'user' || role === 'admin') && (
          <>
            {role === 'user' && (
                <Link to="/qa/runner" className={`menu-item ${isActive('/qa/runner')}`}>
                <span>Execução (Runner)</span>
                </Link>
            )}
            <Link to="/qa/defeitos" className={`menu-item ${isActive('/qa/defeitos')}`}>
              <span>Defeitos</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}