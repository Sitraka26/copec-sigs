import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [aideOuverte, setAideOuverte] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    const emailNormalise = email.trim().toLowerCase();
    if (!emailNormalise || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalise)) {
      setErreur('Veuillez saisir une adresse email valide.');
      return;
    }
    if (!motDePasse || motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setChargement(true);
    try {
      const { data } = await api.post('/auth/login', { email: emailNormalise, motDePasse });
      localStorage.setItem('token', data.token);
      localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));
      navigate('/');
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Fond */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top_left,_#3b82f6_0%,_transparent_50%)]" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_bottom_right,_#1d4ed8_0%,_transparent_45%)]" />

      <div className="relative w-full max-w-5xl grid md:grid-cols-2 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/40 border border-white/20">
        {/* Panneau gauche */}
        <div className="hidden md:flex relative bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-white p-10 flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_#60a5fa_0%,_transparent_55%)]" />
          <div className="relative">
            <img
              src="/logo-copec.png"
              alt="Logo COPEC"
              className="w-24 h-24 object-contain bg-white rounded-2xl p-2.5 shadow-2xl mb-8"
            />
            <p className="text-blue-200/90 text-xs font-semibold tracking-[0.2em] uppercase">
              Espace de gestion scolaire
            </p>
            <h1 className="text-4xl font-bold mt-3 tracking-tight">
              SIGS <span className="text-blue-300">COPEC</span>
            </h1>
            <p className="text-blue-100/85 mt-5 leading-relaxed text-sm max-w-sm">
              Suivez les élèves, les notes, les présences, les paiements et la vie de l’établissement
              — en local, adapté à chaque rôle.
            </p>
          </div>
          <div className="relative text-xs text-blue-200/80 border-t border-white/15 pt-5 space-y-1">
            <p>Accès automatique selon votre profil</p>
            <p className="text-blue-300/60">Application locale de l’établissement</p>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="relative p-7 sm:p-10 bg-white">
          <div className="md:hidden mb-7">
            <img
              src="/logo-copec.png"
              alt="Logo COPEC"
              className="w-16 h-16 object-contain rounded-xl shadow-md mb-4 bg-white"
            />
            <p className="text-blue-700 text-[11px] font-semibold tracking-[0.15em] uppercase">
              SIGS COPEC
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Connexion</h1>
          </div>

          <h2 className="hidden md:block text-2xl font-bold text-slate-900 tracking-tight">
            Connexion
          </h2>
          <p className="text-sm text-slate-500 mt-1.5 mb-7">
            Utilisez le compte remis par l’établissement.
          </p>

          {erreur && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm mb-5">
              {erreur}
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Adresse email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-3 mb-5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
            autoComplete="username"
            placeholder="ex. enseignant@copec.local"
            required
          />

          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Mot de passe
          </label>
          <div className="relative mb-2">
            <input
              type={afficherMotDePasse ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-3 pr-24 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setAfficherMotDePasse((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-blue-700 transition"
            >
              {afficherMotDePasse ? 'Masquer' : 'Afficher'}
            </button>
          </div>

          <button
            type="submit"
            disabled={chargement}
            className="w-full mt-5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold rounded-xl py-3 text-sm shadow-lg shadow-blue-700/25 transition"
          >
            {chargement ? 'Connexion…' : 'Se connecter'}
          </button>

          <button
            type="button"
            onClick={() => setAideOuverte((o) => !o)}
            className="w-full text-sm text-blue-700 mt-5 hover:text-blue-900 transition"
          >
            Mot de passe oublié ?
          </button>

          {aideOuverte && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed">
              Pas de récupération par email (fonctionnement local). Demandez à l’administrateur de
              réinitialiser votre mot de passe dans <strong>Enseignants</strong>. Connectez-vous
              ensuite avec le mot de passe temporaire, puis changez-le dans <strong>Mon compte</strong>.
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-10">
            Application locale · COPEC Isaha
          </p>
        </form>
      </div>
    </div>
  );
}