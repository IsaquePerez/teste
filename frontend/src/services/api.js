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
  
  const isFormData = options.body instanceof FormData || options.body instanceof URLSearchParams;
  
  if (!headers.has("Content-Type") && !isFormData) {
    headers.append("Content-Type", "application/json");
  }

  const config = {
    ...options,
    headers,
  };

  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  try {
    const response = await fetch(url, config);
    
    const isLoginRequest = url.includes("/login");
    if (response.status === 401 && !isLoginRequest) {
      clearSession();
      throw new Error("Sessão expirada.");
    }

    let data = null;
    const contentType = response.headers.get("content-type");

    if (response.status !== 204) {
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }
    } else {
      data = {};
    }
    
    if (!response.ok) {
        const errorMessage = data?.detail 
            ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
            : (data?.message || "Erro na requisição");
            
        throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { method: "GET", ...options }),
  
  post: (endpoint, body, options = {}) => {
    const isBinary = body instanceof FormData || body instanceof URLSearchParams;
    return request(endpoint, { 
        method: "POST", 
        body: isBinary ? body : JSON.stringify(body),
        ...options 
    });
  },
  
  put: (endpoint, body, options = {}) => {
    const isBinary = body instanceof FormData || body instanceof URLSearchParams;
    return request(endpoint, { 
        method: "PUT", 
        body: isBinary ? body : JSON.stringify(body),
        ...options 
    });
  },
  
  delete: (endpoint, body, options = {}) => {
      const isBinary = body instanceof FormData || body instanceof URLSearchParams;
      return request(endpoint, { 
          method: "DELETE", 
          body: body ? (isBinary ? body : JSON.stringify(body)) : null,
          ...options 
      });
  },
};