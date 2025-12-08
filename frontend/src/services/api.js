// frontend/src/services/api.js

// Lê a variável definida no docker-compose.yml
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const getSession = () => ({
  token: sessionStorage.getItem("token"),
  username: sessionStorage.getItem("username"),
  role: sessionStorage.getItem("role"),
  nome: sessionStorage.getItem("nome"),
});

export const clearSession = () => {
  sessionStorage.clear();
  window.location.href = "/"; 
};

async function request(endpoint, options = {}) {
  const { token } = getSession();
  const headers = new Headers(options.headers || {});
  
  if (token) headers.append("Authorization", `Bearer ${token}`);
  headers.append("Content-Type", "application/json");

  const config = {
    ...options,
    headers,
  };

  // Garante que o endpoint começa com / se não for um URL completo
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401 || response.status === 403) {
      clearSession();
      throw new Error("Sessão expirada.");
    }

    // Tenta fazer parse do JSON, mas não falha se não houver corpo (ex: 204 No Content)
    const data = response.status !== 204 ? await response.json().catch(() => ({})) : {};
    
    if (!response.ok) {
      throw new Error(data.detail || data.message || "Erro na requisição");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Exporta métodos simplificados como no seu script original, mas modernizados
export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, body) => request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: (endpoint, body) => request(endpoint, { method: "DELETE", body: JSON.stringify(body) }),
};