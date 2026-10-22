import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Niveaux() {
  const [niveaux, setNiveaux] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreCycle, setFiltreCycle] = useState('TOUS');
  const [reinitialisation, setReinitialisation] = useState(false);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [niveauCourantId, setNiveauCourantId] = useState('');
  const [formulaire, setFormulaire] = useState({
    libelle: '',
    cycle: 'PRIMAIRE',
    filiere: '',
    ordre: 1,
  });

  async function chargerNiveaux() {
    try {
      const { data } = await api.get('/niveaux');
      setNiveaux(data);
      setErreur('');
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement des niveaux');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerNiveaux();
  }, []);

  function ouvrirCreation() {
    setModeEdition(false);
    setNiveauCourantId('');
    setFormulaire({ libelle: '', cycle: 'PRIMAIRE', filiere: '', ordre: 1 });
    setErreur('');
    setMessage('');
    setModaleOuverte(true);
  }

  function ouvrirEdition(niveau) {
    setModeEdition(true);
    setNiveauCourantId(niveau.id);
    setFormulaire({
      libelle: niveau.libelle,
      cycle: niveau.cycle,
      filiere: niveau.filiere || '',
      ordre: niveau.ordre,
    });
    setErreur('');
    setMessage('');
    setModaleOuverte(true);
  }

  async function soumettreFormulaire(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');
    try {
      if (modeEdition) {
        await api.put(`/niveaux/${niveauCourantId}`, formulaire);
        setMessage('Niveau modifié.');
      } else {
        const { ordre, ...donnees } = formulaire;
        await api.post('/niveaux', donnees);
        setMessage('Niveau créé (ordre calculé automatiquement).');
      }
      setModaleOuverte(false);
      await chargerNiveaux();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    }
  }

  async function supprimerNiveau(id) {
    if (
      !window.confirm(
        'Supprimer ce niveau ?\nLes classes qui l’utilisent empêchent la suppression.'
      )
    ) {
      return;
    }
    setErreur('');
    setMessage('');
    try {
      const { data } = await api.delete(`/niveaux/${id}`);
      setMessage(data.message || 'Niveau supprimé.');
      await chargerNiveaux();
    } catch (err) {
      setErreur(
        err.response?.data?.error || 'Erreur lors de la suppression'
      );
    }
  }

  async function reinitialiserOrdre() {
    if (
      !window.confirm(
        'Réinitialiser automatiquement l’ordre de tous les niveaux (1, 2, 3…) ?'
      )
    ) {
      return;
    }
    setReinitialisation(true);
    setErreur('');
    setMessage('');
    try {
      const { data } = await api.post('/niveaux/reordonner');
      setMessage(data.message || 'Ordre réinitialisé.');
      await chargerNiveaux();
    } catch (err) {
      setErreur(
        err.response?.data?.error ||
          'Erreur lors de la réinitialisation de l’ordre'
      );
    } finally {
      setReinitialisation(false);
    }
  }

  const niveauxFiltres = niveaux.filter((niveau) => {
    const rechercheNormalisee = recherche.trim().toLowerCase();
    const correspondRecherche =
      !rechercheNormalisee ||
      `${niveau.libelle} ${niveau.filiere || ''} ${niveau.cycle}`
        .toLowerCase()
        .includes(rechercheNormalisee);
    return (
      correspondRecherche &&
      (filtreCycle === 'TOUS' || niveau.cycle === filtreCycle)
    );
  });

  const cycles = [
    ['PRESCOLAIRE', 'Préscolaire'],
    ['PRIMAIRE', 'Primaire'],
    ['COLLEGE', 'Collège'],
    ['LYCEE', 'Lycée'],
  ];

  if (chargement) {
    return <div className="p-8 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium">Gestion des niveaux</h1>
        <div className="flex gap-2">
          <button
            onClick={reinitialiserOrdre}
            disabled={reinitialisation || niveaux.length < 2}
            className="border border-slate-300 px-3 py-2 rounded text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {reinitialisation ? 'Réinitialisation...' : 'Réinitialiser l’ordre'}
          </button>
          <button
            onClick={ouvrirCreation}
            className="bg-slate-800 text-white px-3 py-2 rounded text-sm hover:bg-slate-700"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {erreur && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-4">
          {erreur}
        </p>
      )}
      {message && (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mb-4">
          {message}
        </p>
      )}

      <div className="bg-white border rounded p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            className="border rounded px-3 py-2 text-sm min-w-64"
            placeholder="Rechercher un niveau ou une filière..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 text-sm"
            value={filtreCycle}
            onChange={(e) => setFiltreCycle(e.target.value)}
          >
            <option value="TOUS">Tous les cycles</option>
            {cycles.map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {niveauxFiltres.length} niveau(x) affiché(s) sur {niveaux.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {cycles.map(([valeur, libelle]) => (
            <span key={valeur} className="text-xs bg-slate-100 rounded px-2 py-1">
              {libelle} : {niveaux.filter((n) => n.cycle === valeur).length}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Ordre</th>
              <th className="px-4 py-2">Libellé</th>
              <th className="px-4 py-2">Cycle</th>
              <th className="px-4 py-2">Filière</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {niveauxFiltres.map((niveau) => (
              <tr key={niveau.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{niveau.ordre}</td>
                <td className="px-4 py-2 font-medium">{niveau.libelle}</td>
                <td className="px-4 py-2">
                  {cycles.find(([v]) => v === niveau.cycle)?.[1] || niveau.cycle}
                </td>
                <td className="px-4 py-2">{niveau.filiere || '—'}</td>
                <td className="px-4 py-2 space-x-3">
                  <button
                    onClick={() => ouvrirEdition(niveau)}
                    className="text-blue-700 hover:underline"
                  >
                    Éditer
                  </button>
                  <button
                    onClick={() => supprimerNiveau(niveau.id)}
                    className="text-red-700 hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {niveauxFiltres.length === 0 && (
          <p className="p-6 text-center text-slate-400 text-sm">Aucun niveau.</p>
        )}
      </div>

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">
              {modeEdition ? 'Modifier le niveau' : 'Nouveau niveau'}
            </h2>
            <form onSubmit={soumettreFormulaire} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Libellé</label>
                <input
                  required
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.libelle}
                  onChange={(e) =>
                    setFormulaire((f) => ({ ...f, libelle: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Cycle</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.cycle}
                  onChange={(e) =>
                    setFormulaire((f) => ({ ...f, cycle: e.target.value }))
                  }
                >
                  <option value="PRESCOLAIRE">Préscolaire</option>
                  <option value="PRIMAIRE">Primaire</option>
                  <option value="COLLEGE">Collège</option>
                  <option value="LYCEE">Lycée</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Filière (optionnel)</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.filiere}
                  onChange={(e) =>
                    setFormulaire((f) => ({ ...f, filiere: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Ordre {modeEdition ? '' : '(automatique à la création)'}
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={!modeEdition}
                  className="w-full border rounded px-3 py-2 disabled:bg-slate-50"
                  value={formulaire.ordre}
                  onChange={(e) =>
                    setFormulaire((f) => ({
                      ...f,
                      ordre: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModaleOuverte(false)}
                  className="px-3 py-2 rounded border"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-slate-800 text-white px-3 py-2 rounded"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}