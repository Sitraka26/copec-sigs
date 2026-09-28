import { useEffect, useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import api from '../api/client';
import IndicateurReseau from './IndicateurReseau';

const TOUS = ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ECONOME', 'ENSEIGNANT', 'SURVEILLANT'];

const liensMenu = [
  { to: '/', label: 'Tableau de bord', end: true, roles: TOUS },
  { to: '/messages', label: 'Messages', roles: TOUS, badge: true },
  { to: '/eleves', label: 'Élèves', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ECONOME', 'ENSEIGNANT', 'SURVEILLANT'] },
  { to: '/classes', label: 'Classes', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT'] },
  { to: '/inscriptions', label: 'Inscriptions', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'] },
  { to: '/enseignants', label: 'Enseignants', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'] },
  { to: '/notes', label: 'Notes', roles: ['ADMIN', 'DIRECTEUR', 'ENSEIGNANT'] },
  { to: '/bulletins', label: 'Bulletins', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT'] },
  { to: '/presences', label: 'Présences', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT', 'SURVEILLANT'] },
  { to: '/paiements', label: 'Paiements', roles: ['ADMIN', 'DIRECTEUR', 'ECONOME'] },
  { to: '/emploi-du-temps', label: 'Emploi du temps', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT', 'SURVEILLANT'] },
  { to: '/programme', label: 'Programme', roles: ['ADMIN', 'DIRECTEUR'] },
  { to: '/niveaux', label: 'Niveaux', roles: ['ADMIN', 'DIRECTEUR', 'ECONOME'] },
  { to: '/discipline', label: 'Discipline', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT', 'SURVEILLANT'] },
  { to: '/certificats', label: 'Certificats', roles: ['ADMIN', 'DIRECTEUR', 'ENSEIGNANT'], badgeCert: true },
  { to: '/journal', label: 'Journal d’activité', roles: ['ADMIN', 'DIRECTEUR'] },
  { to: '/rapports', label: 'Rapports', roles: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ECONOME'] },
  { to: '/parametres', label: 'Paramètres', roles: ['ADMIN', 'DIRECTEUR', 'ECONOME'] },
];

export default function Layout() {
  const navigate = useNavigate();
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');
  const role = utilisateur?.role;
  const [nonLus, setNonLus] = useState(0);
  const [certEnAttente, setCertEnAttente] = useState(0);

  const liensVisibles = liensMenu.filter((lien) => !role || lien.roles.includes(role));

  useEffect(() => {
    function chargerCompteurs() {
      api
        .get('/messages/non-lus/nombre')
        .then(({ data }) => setNonLus(data.nonLus || 0))
        .catch(() => {});

      if (['ADMIN', 'DIRECTEUR'].includes(role)) {
        api
          .get('/certificats/demandes/en-attente/nombre')
          .then(({ data }) => setCertEnAttente(data.enAttente || 0))
          .catch(() => {});
      }
    }

    chargerCompteurs();
    const intervalle = setInterval(chargerCompteurs, 30000);
    return () => clearInterval(intervalle);
  }, [role]);

  function deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-sky-100">
      <aside className="w-60 bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <img
            src="/logo-copec.png"
            alt="COPEC"
            className="w-11 h-11 rounded-xl object-contain bg-white p-1 shadow-lg"
          />
          <div>
            <div className="text-xl font-bold tracking-tight">
              SIGS <span className="text-blue-400">COPEC</span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
              Gestion scolaire
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {liensVisibles.map((lien) => (
            <NavLink
              key={lien.to}
              to={lien.to}
              end={lien.end}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 shadow-lg shadow-blue-950/30 font-medium'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{lien.label}</span>
              {lien.badge && nonLus > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {nonLus}
                </span>
              )}
              {lien.badgeCert && certEnAttente > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {certEnAttente}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 text-sm bg-black/10">
          <NavLink to="/mon-compte" className="block mb-1 hover:text-white text-slate-300">
            {utilisateur?.prenom} {utilisateur?.nom}
          </NavLink>
          <div className="text-xs text-slate-500 mb-2">{role}</div>
          <button
            onClick={deconnexion}
            className="text-slate-400 hover:text-red-300 text-xs transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-sky-100">
        <Outlet />
      </main>

      <IndicateurReseau />
    </div>
  );
}