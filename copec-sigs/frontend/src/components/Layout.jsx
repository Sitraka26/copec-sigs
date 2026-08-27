import { NavLink, useNavigate, Outlet } from 'react-router-dom';

const liensMenu = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/eleves', label: 'Élèves' },
  { to: '/classes', label: 'Classes' },
  { to: '/inscriptions', label: 'Inscriptions' },
  { to: '/notes', label: 'Notes' },
  { to: '/presences', label: 'Présences' },
  { to: '/paiements', label: 'Paiements' },
  { to: '/emploi-du-temps', label: 'Emploi du temps' },
];

export default function Layout() {
  const navigate = useNavigate();
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');

  function deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="p-4 text-lg font-semibold border-b border-slate-700">SIGS COPEC</div>
        <nav className="flex-1 p-2 space-y-1">
          {liensMenu.map((lien) => (
            <NavLink
              key={lien.to}
              to={lien.to}
              end={lien.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`
              }
            >
              {lien.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700 text-sm">
          <div className="mb-2">{utilisateur?.prenom} {utilisateur?.nom}</div>
          <button onClick={deconnexion} className="text-slate-400 hover:text-white text-xs">
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
