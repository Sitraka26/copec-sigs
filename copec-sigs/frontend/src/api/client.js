import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si le token est expiré ou invalide (401), on nettoie la session et on
// renvoie automatiquement vers la page de connexion, au lieu de laisser
// l'application dans un état cassé avec des erreurs en console.
api.interceptors.response.use(
  (reponse) => reponse,
  (erreur) => {
    if (erreur.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('utilisateur');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(erreur);
  }
);

export default api;