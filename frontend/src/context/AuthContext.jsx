import { createContext, useContext, useState, useEffect } from 'react';
import { getSession, clearSession } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaura sessão ao recarregar a página
    const session = getSession();
    if (session.token) {
      setUser(session);
    }
    setLoading(false);
  }, []);

  const login = (apiResponse) => {
    // Guarda no sessionStorage como o script.js original fazia
    sessionStorage.setItem("token", apiResponse.access_token);
    sessionStorage.setItem("role", apiResponse.role);
    sessionStorage.setItem("username", apiResponse.username);
    sessionStorage.setItem("nome", apiResponse.nome);
    
    setUser({
      token: apiResponse.access_token,
      role: apiResponse.role,
      username: apiResponse.username,
      nome: apiResponse.nome
    });
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  if (loading) return <div>A carregar...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);