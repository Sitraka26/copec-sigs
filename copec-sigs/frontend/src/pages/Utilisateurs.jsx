import { useEffect, useState } from 'react';
import api from '../api/client';

const ROLES = [
  { value: 'DIRECTEUR', label: 'Directeur' },
  { value: 'SECRETAIRE', label: 'Secrétaire' },
  { value: 'ECONOME', label: 'Économe' },
  { value: 'SURVEILLANT', label: 'Surveillant' },
  { value: 'ADMIN', label: 'Administrateur' },
];

const LIBELLES_ROLE = {
  ADMIN: 'Administrateur',
  DIRECTEUR: 'Directeur',
  SECRETAIRE: 'Secrétaire',
  ECONOME: 'Économe',
  ENSEIGNANT: 'Enseignant',
  SURVEILLANT: 'Surveillant',
};

const CHAMPS_VIDES = { nom: '', prenom: '', email: '', role: 'SECRETAIRE' };

export default function Utilisateurs() {
  const [liste, setListe] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [modale, setModale] = useState(false);
  const [formulaire, setFormulaire] = useState(CHAMPS_VIDES);
  const [enregistrement, setEnregistrement] = useState(false);
  const [mdpTemporaire, setMdpTemporaire] = useState(null);

  async function charger() {
    setChargement(true);
    setErreur('');
    try {
      const { data } = await api.get('/utilisateurs');
      setListe(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function soumettre(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    setMessage('');
    try {
      const { data } = await api.post('/utilisateurs', formulaire);
      setMdpTemporaire({
        email: data.utilisateur.email,
        mdp: data.motDePasseTemporaire,
        role: data.utilisateur.role,
      });
      setModale(false);
      setFormulaire(CHAMPS_VIDES);
      setMessage('Compte créé avec succès.');
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setEnregistrement(false);
    }
  }

  async function resetMdp(id) {
    setErreur('');
    try {
      const { data } = await api.post(`/utilisateurs/${id}/reset-password`);
      const u = liste.find((x) => x.id === id);
      setMdpTemporaire({
        email: u?.email,
        mdp: data.motDePasseTemporaire,
        role: u?.role,
      });
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur reset mot de passe');
    }
  }

  async function toggleActif(id) {
    setErreur('');
    try {
      await api.patch(`/utilisateurs/${id}/actif`);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur');
    }
  }

  return (
    <div className="p-4 sm:p-8 min-h-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Utilisateurs</h1>
          <p className="text-slate-500 text-sm mt-1">
            Créer les comptes Secrétaire, Économe, Surveillant, Directeur…
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormulaire(CHAMPS_VIDES);
            setErreur('');
            setModale(true);
          }}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-slate-800 hover:bg-slate-700"
        >
          + Nouvel utilisateur
        </button>
      </div>

      {erreur && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {erreur}
        </p>
      )}
      {message && (
        <p className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          {message}
        </p>
      )}

      {mdpTemporaire && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="font-medium text-amber-900 text-sm mb-1">Mot de passe temporaire</p>
          <p className="text-sm text-amber-800">
            <strong>{mdpTemporaire.email}</strong> ({LIBELLES_ROLE[mdpTemporaire.role] || mdpTemporaire.role})
          </p>
          <p className="mt-2 font-mono text-lg font-bold text-amber-950">{mdpTemporaire.mdp}</p>
          <p className="text-xs text-amber-700 mt-2">
            À communiquer à la personne. Elle pourra le changer dans Mon compte.
          </p>
          <button
            type="button"
            onClick={() => setMdpTemporaire(null)}
            className="mt-3 text-xs text-amber-800 underline"
          >
            Fermer
          </button>
        </div>
      )}

      {chargement ? (
        <p className="text-slate-500">Chargement…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liste.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium">
                    {u.prenom} {u.nom}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {LIBELLES_ROLE[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.actif ? (
                      <span className="text-xs text-emerald-700">Actif</span>
                    ) : (
                      <span className="text-xs text-red-600">Inactif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      type="button"
                      onClick={() => resetMdp(u.id)}
                      className="text-xs text-blue-700 hover:underline"
                    >
                      Reset MDP
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActif(u.id)}
                      className="text-xs text-slate-600 hover:underline"
                    >
                      {u.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modale && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Nouvel utilisateur</h2>
            <form onSubmit={soumettre} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Nom</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={formulaire.nom}
                  onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Prénom</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={formulaire.prenom}
                  onChange={(e) => setFormulaire({ ...formulaire, prenom: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2"
                  value={formulaire.email}
                  onChange={(e) => setFormulaire({ ...formulaire, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Rôle</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={formulaire.role}
                  onChange={(e) => setFormulaire({ ...formulaire, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModale(false)}
                  className="px-4 py-2 text-sm rounded-lg border"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enregistrement}
                  className="px-4 py-2 text-sm rounded-lg bg-slate-800 text-white disabled:opacity-50"
                >
                  {enregistrement ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}