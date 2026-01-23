import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function TopHeader({ toggleSidebar }) {
  const { user, logout } = useAuth();

  const [isHovered, setIsHovered] = useState(false);

  const nomeCompleto = user?.nome || 'Usuário';
  const primeiroNome = nomeCompleto.trim().split(" ")[0];

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
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{ 
                height: '40px', 
                marginRight: '8px',
                transition: 'all 0.3s ease',
                transform: isHovered ? 'scale(1.2)' : 'scale(1.0)'
              }} 
            />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="header-user-badge">
              <span 
                className="header-user-name"
                title={nomeCompleto} 
                style={{
                  display: 'inline-block',
                  maxWidth: '100px',   
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  verticalAlign: 'middle'
                }}
              >
                {primeiroNome}
              </span>
          </div>
          <button onClick={logout} className="btn danger header-logout-btn">
              Sair
          </button>
      </div>
    </header>
  );
}