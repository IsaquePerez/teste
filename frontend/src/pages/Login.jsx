import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import '../styles/login.css';

export function Login() {
  const navigate = useNavigate();
  // Adicionado 'logout' e 'isAuthenticated' para verificar e limpar a sessão
  const { login, logout, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]); 
  
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
      // 1. Prepara os dados (Padrão OAuth2)
      const params = new URLSearchParams();
      params.append('username', username); // O backend exige 'username', mesmo sendo email
      params.append('password', password);

      // 2. Envia com HEADER EXPLÍCITO
      // Isso garante que o backend entenda o formato, não deixando pro navegador decidir
      const response = await api.post("/login/", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      
      // O seu api.js atualizado já retorna o data diretamente se response.ok for true
      // Mas por segurança, garantimos que temos o objeto
      const data = response; 

      // 3. Normalização (Caso o backend não mande tudo)
      if (!data.role) data.role = username.toLowerCase().includes("admin") ? "admin" : "user";
      if (!data.username) data.username = username;

      // 4. Salva login e redireciona
      login(data);
      
      if (data.role === 'admin') {
           navigate('/admin', { replace: true });
      } else {
           navigate('/qa/runner', { replace: true });
      }

    } catch (err) {
      console.error("Login Error:", err);
      // Tratamento de erro robusto
      const msg = err.message || "Falha no login. Verifique as credenciais.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="page-login-wrapper">

      <main className="container narrow">
        <section className="login-card">
          <h1 className="login-section-title">Login</h1>

          <form onSubmit={handleSubmit} className="login-form-grid">
            <div>
              <input 
                type="text" 
                id="username"
                required 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuário" 
              />
            </div>
            <div>
              <input 
                type="password" 
                id="password"
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="Senha" 
              />
            </div>
            
            <div className="actions" style={{ gridColumn: '1/-1' }}>
              <button type="submit" className="login-btn primary" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <div className="image-half">
        <img src="/logoveritus-login.png" alt="Veritus" className="right-half-image" />
      </div>

      {error && (
        <div className="snackbar snackbar-error">
          {error}
        </div>
      )}

    </div>
  );
}