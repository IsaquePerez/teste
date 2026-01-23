import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useSnackbar } from '../../context/SnackbarContext';
import styles from './styles.module.css';
import { Eye, EyeOff } from 'lucide-react';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success: snackSuccess, error: snackError } = useSnackbar();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [isDone, setIsDone] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsDontMatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {

    if (isDone) return;

    async function validateToken() {
      if (!token) {
        snackError("Token de redefinição não encontrado.");
        navigate('/forgot-password');
        return;
      }
      try {
        await api.get(`/reset-password/validate?token=${token}`);
        setTokenValid(true);
      } catch (err) {
        console.error("Erro ao validar token:", err);
        snackError("Link de redefinição inválido ou expirado.");
        navigate('/forgot-password');
      }
    }
    validateToken();
  }, [token, navigate, snackError, isDone]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      snackError("Por favor, preencha todos os campos.");
      return;
    }

    if (password !== confirmPassword) {
      snackError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      snackError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        token: token,
        new_password: password,
      };

      await api.post("/reset-password/confirm", payload);

      setIsDone(true);
      snackSuccess("Sua senha foi redefinida com sucesso!");

      navigate('/', { replace: true });

    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      snackError(err.response?.data?.message || "Não foi possível redefinir a senha. Tente novamente ou solicite um novo link.");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className={styles.wrapper}>
        <main className={`${styles.container} ${styles.resetPasswordContainer}`}>
          <section className={styles.card}>
            <p>Verificando token...</p>
          </section>
        </main>
        <div className={styles.imageHalf}>
          <img src="/logoveritus-login.png" alt="Veritus" className={styles.rightHalfImage} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <main className={`${styles.container} ${styles.resetPasswordContainer}`}>
        <section className={styles.card}>
          <h1 className={styles.title}>Definir Nova Senha</h1>
          <p className={styles.subtitle}>
            Insira sua nova senha.
          </p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.inputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nova Senha"
                className={`${styles.input} ${passwordsDontMatch ? styles.inputError : ''}`}
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
            <div className={styles.inputContainer}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirme a Nova Senha"
                className={`${styles.input} ${passwordsDontMatch ? styles.inputError : ''}`}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {passwordsDontMatch && (
              <span className={styles.errorMessage}>
                As senhas não coincidem
              </span>
            )}

            <div style={{ gridColumn: '1/-1' }}>
              <button
                type="submit"
                className={styles.button}
                disabled={loading || passwordsDontMatch || password.length < 6 || confirmPassword.length < 1}
              >
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
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