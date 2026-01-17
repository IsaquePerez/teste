import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext'; 
import styles from './styles.module.css';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { error: snackError, success: snackSuccess } = useSnackbar();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      snackError("Por favor, informe o e-mail cadastrado.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      snackError("Por favor, inclua um '@' e um domínio válido no endereço de e-mail.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: email
      };

      await api.post("/forgot-password", payload);
      
      snackSuccess(
        "Se o e-mail estiver cadastrado, um link de redefinição foi enviado. Verifique sua caixa de entrada."
      );
      
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);

    } catch (err) {
      console.error("Forgot Password Error:", err);
      
      const backendMessage = err.message || "Não foi possível processar a solicitação.";
      
      if (backendMessage.includes("rede") || backendMessage.includes("timeout")) {
          snackError(backendMessage);
      } else {
          snackSuccess(
            "Se o e-mail estiver cadastrado, um link de redefinição foi enviado. Verifique sua caixa de entrada."
          );
      }
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <main className={`${styles.container} ${styles.forgotPasswordContainer}`}>
        <section className={styles.card}>
          <h1 className={styles.title}>Recuperação de Senha</h1>
          <p className={styles.subtitle}>
            Informe seu e-mail cadastrado.<br />Enviaremos um link para você redefinir sua senha.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <input 
                type="text" 
                id="email"
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="E-mail" 
                className={styles.input}
              />
            </div>
            
            <div style={{ gridColumn: '1/-1' }}>
              <button 
                type="submit" 
                className={styles.button} 
                disabled={loading || email.length < 1}
              >
                {loading ? 'Enviando...' : 'Solicitar Redefinição'}
              </button>
            </div>
          </form>
          
          <div className={styles.utilityLinks}>
            <Link to="/" className={styles.forgotPasswordLink}>
              ← Voltar para o Login
            </Link>
          </div>
        </section>
      </main>

      <div className={styles.imageHalf}>
        <img src="/logoveritus-login.png" alt="Veritus" className={styles.rightHalfImage} />
      </div>
    </div>
  );
}   