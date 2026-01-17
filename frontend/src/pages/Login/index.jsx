import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext'; 
import { api } from '../../services/api';
import styles from './styles.module.css';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  
  const { error: snackError, success: snackSuccess, warning: snackWarning } = useSnackbar();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // FIXED: Instead of logging out, redirect users who are already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/qa/runner', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      snackWarning("Por favor, informe o usuário.");
      return;
    }

    if (!password.trim()) {
      snackWarning("Por favor, informe a senha.");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post("/login/", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      
      const data = response; 
      
      // Fallback para roles e username caso o backend não envie
      if (!data.role) data.role = "user";
      if (!data.username) data.username = username;

      // Atualiza o contexto global de autenticação
      login(data);
      
      const nomeExibicao = data.nome || data.username || "Usuário";
      snackSuccess(`Bem-vindo, ${nomeExibicao}!`);
      
      // Redirecionamento baseado no perfil
      if (data.role === 'admin') {
           navigate('/admin', { replace: true });
      } else {
           navigate('/qa/runner', { replace: true });
      }

    } catch (err) {
      console.error(err);
      const mensagemBackend = err.response?.data?.detail || err.response?.data?.message;
      snackError(mensagemBackend || err.message || "Falha no login. Verifique as credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <main className={`${styles.container} ${styles.loginContainer}`}>
        <section className={styles.card}>
          <h1 className={styles.title}>Login</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputContainer}>
              <input 
                type="text" 
                id="username"
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuário" 
                className={styles.userinput}
                autoComplete="username"
              />
            </div>
            <div className={styles.inputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Senha"
                className={styles.passinput}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className={styles.utilityLinks}>
              <Link to="/forgot-password" className={styles.forgotPasswordLink}>
                Esqueceu sua senha?
              </Link>
            </div>
            
            <div style={{ gridColumn: '1/-1' }}>
              <button
                type="submit"
                className={styles.button}
                disabled={loading || username.length < 1 || password.length < 1}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <div className={styles.imageHalf}>
        <img src="/logoveritus-login.png" alt="Veritus" className={styles.rightHalfImage} />
      </div>
    </div>
  );
}