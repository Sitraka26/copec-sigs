import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    try {
      const { data } = await api.post('/auth/login', { email, motDePasse });
      localStorage.setItem('token', data.token);
      localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));
      navigate('/');
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de connexion');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm w-full max-w-sm border">
        <h1 className="text-xl font-medium mb-6 text-center">SIGS COPEC</h1>
        {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}
        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
          required
        />
        <label className="block text-sm mb-1">Mot de passe</label>
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-6"
          required
        />
        <button type="submit" className="w-full bg-slate-800 text-white rounded py-2 hover:bg-slate-700">
          Se connecter
        </button>
      </form>
    </div>
  );
}
