import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function Login() {
  const navigate = useNavigate();
  // Adicionamos 'logout' e 'isAuthenticated' para verificar e limpar a sessão
  const { login, logout, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // EFEITO DE SEGURANÇA:
  // Se o utilizador chegar a esta página (ex: clicando em "Voltar" no navegador)
  // e ainda estiver autenticado, fazemos logout forçado.
  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post("/login", { username, password });
      
      // Normalização de dados (caso o backend não envie tudo)
      if (!data.role) data.role = username.toLowerCase().includes("admin") ? "admin" : "user";
      if (!data.username) data.username = username;

      login(data);
      if (data.role === 'admin') {
          navigate('/admin', { replace: true });
      } else {
          navigate('/qa/runner', { replace: true });
      }

    } catch (err) {
      console.error(err);
      setError(err.message || "Falha no login. Verifique as credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-login-wrapper">
      <header className="topbar">
        <div className="brand-wrap" style={{borderBottom: 'none', marginBottom: 0, padding: 0}}>
          {/* Certifique-se que a imagem está na pasta 'public' */}
          <img src="/logoge.png" alt="GE" className="brand-logo" />
          <div className="brand">Test Manager ERP</div>
        </div>
      </header>

      <main className="container narrow">
        <section className="card">
          <h1 className="section-title">Acessar</h1>
          <p className="muted">Use as credenciais de demonstração para entrar.</p>

          {/* Bloco Informativo */}
          <div className="info-block">
            <div><strong>Admin:</strong> <code>admin@example.com</code> / <code>adm123</code></div>
            <div style={{marginTop: '5px'}}><strong>Testadores (Ex):</strong> 
              <code>igor@example.com</code> / <code>adm123</code>
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-grid">
            <div>
              <label htmlFor="username">Usuário (Email)</label>
              <input 
                type="text" 
                id="username"
                required 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="ex.: admin@example.com" 
              />
            </div>
            <div>
              <label htmlFor="password">Senha</label>
              <input 
                type="password" 
                id="password"
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="ex.: adm123" 
              />
            </div>
            
            <div className="actions" style={{ gridColumn: '1/-1' }}>
              <button type="submit" className="btn primary" disabled={loading} style={{width: '100%'}}>
                {loading ? 'A entrar...' : 'Entrar'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}