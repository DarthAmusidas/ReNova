import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Sesión vencida o inválida: se limpia y se vuelve al login.
// Las rutas de /auth devuelven 401 por credenciales incorrectas, así que no se tocan.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 && !url.startsWith("/auth/") && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const next = window.location.pathname.startsWith("/retiro/")
        ? `&next=${encodeURIComponent(window.location.pathname)}`
        : "";
      window.location.assign(`/login?session=expired${next}`);
    }

    return Promise.reject(error);
  }
);

export default api;
