import { createContext, useContext, useState } from 'react';
import { getSession, clearSession } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const session = getSession();
    return session.token ? session : null;
  });

  const login = (apiResponse) => {
   
    const sessionData = {
        token: apiResponse.access_token || apiResponse.token,
        role: apiResponse.role,
        username: apiResponse.username,
        nome: apiResponse.nome
    };


    sessionStorage.setItem("token", sessionData.token);
    sessionStorage.setItem("role", sessionData.role);
    sessionStorage.setItem("username", sessionData.username);
    sessionStorage.setItem("nome", sessionData.nome);
    
    setUser(sessionData);
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("nome");
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);