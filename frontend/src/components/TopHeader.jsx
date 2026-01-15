import { useAuth } from '../context/AuthContext';

export function TopHeader({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const truncate = (str, n = 30) => (str && str.length > n) ? str.substr(0, n - 1) + '...' : str || '';
  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="btn-mobile-menu" onClick={toggleSidebar} title="Abrir Menu">☰</button>
        
        <div style={{ 
            marginLeft: '-10px', 
            display: 'flex', 
            alignItems: 'center' 
        }}>
            <img 
                src="/logoveritus.png" 
                alt="Veritus" 
                style={{ 
                    height: '40px', 
                    marginRight: '8px' 
                }} 
            />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="header-user-badge">
              <span className="header-user-name">{truncate(user?.nome, 15) || 'Usuário'}</span>
          </div>
          <button onClick={logout} className="btn danger header-logout-btn">
             Sair
          </button>
      </div>
    </header>
  );
}