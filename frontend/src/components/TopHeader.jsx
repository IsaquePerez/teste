import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logout } from './icons/Logout';
import { List } from './icons/List';
import { AccessibilityFont } from '../components/AccessibiliyFont';
import { Sun, Moon } from './icons/ThemeIcons';

export function TopHeader({ toggleSidebar }) {
  const { user, logout } = useAuth();

  const [isHovered, setIsHovered] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const nomeCompleto = user?.nome || 'Usuário';
  const primeiroNome = nomeCompleto.trim().split(' ')[0];

  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
      setIsDark(true);
    }
  }, []);

 
  function toggleTheme() {
    document.body.classList.toggle('dark');
    const darkActive = document.body.classList.contains('dark');
    setIsDark(darkActive);
    localStorage.setItem('theme', darkActive ? 'dark' : 'light');
  }

  return (
    <header className="top-header">
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="btn-mobile-menu" onClick={toggleSidebar} title="Abrir Menu"><List /></button>
        
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
                transform: isHovered ? 'scale(1.2)' : 'scale(1.0)',
                filter: isDark ? 'drop-shadow(0px 5px 10px rgba(100,100,100, 0.5))' : 'drop-shadow(0px 5px 10px rgba(0,0,0, 0.5))',
              }} 
            />
        </div>
      </div>

    
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

        <AccessibilityFont />

        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark
            ? (<Sun style={{ fontSize: '1.3rem '}}/>)
            : (<Moon style={{ fontSize: '1.3rem '}}/>)
          }
        </button>

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
        <button
          onClick={logout}
          className="btn danger header-logout-btn"
        >
          <Logout />
          Sair
        </button>
      </div>
    </header>
  );
}