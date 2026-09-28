import { useEffect, useState, useMemo } from 'react';
import api from '../api/client';

const CHAMPS_VIDES = { nom: '', prenom: '', email: '', telephone: '' };

export default function Enseignants() {
  const [enseignants, setEnseignants] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [mdpTemporaire, setMdpTemporaire] = useState(null);

  const [modaleAjout, setModaleAjout] = useState(false);
  const [modaleVoir, setModaleVoir] = useState(false);
  const [modaleEdit, setModaleEdit] = useState(false);
  const [modaleMatieres, setModaleMatieres] = useState(false);

  const [formulaire, setFormulaire] = useState(CHAMPS_VIDES);
  const [editionId, setEditionId] = useState(null);
  const [enseignantSelectionne, setEnseignantSelectionne] = useState(null);

  const [matieres, setMatieres] = useState([]);
  const [matieresSelectionnees, setMatieresSelectionnees] = useState([]);

  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_TAILLE = 10;

  async function chargerEnseignants() {
    setChargement(true);
    setErreur('');
    try {
      const { data } = await api.get('/enseignants');
      setEnseignants(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement des enseignants');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerEnseignants();
    api.get('/matieres').then((r) => setMatieres(r.data)).catch(() => {});
  }, []);

  const filtrés = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return enseignants;
    return enseignants.filter((e) =>
      `${e.utilisateur.nom} ${e.utilisateur.prenom} ${e.utilisateur.email || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [enseignants, recherche]);

  const pages = Math.max(1, Math.ceil(filtrés.length / PAGE_TAILLE));
  const affichage = filtrés.slice((page - 1) * PAGE_TAILLE, page * PAGE_TAILLE);

  function majChamp(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur }));
  }

  function ouvrirAjout() {
    setFormulaire(CHAMPS_VIDES);
    setErreur('');
    setMdpTemporaire(null);
    setModaleAjout(true);
  }

  async function soumettreAjout(e) {
    e.preventDefault();
    setErreur('');
    try {
      const { data } = await api.post('/enseignants', formulaire);
      setModaleAjout(false);
      setMdpTemporaire({
        email: data.utilisateur?.email || formulaire.email,
        mdp: data.motDePasseTemporaire,
      });
      setMessage('Enseignant créé avec succès.');
      await chargerEnseignants();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la création');
    }
  }

  function ouvrirVoir(ens) {
    setEnseignantSelectionne(ens);
    setModaleVoir(true);
  }

  function ouvrirEdit(ens) {
    setEditionId(ens.id);
    setFormulaire({
      nom: ens.utilisateur.nom,
      prenom: ens.utilisateur.prenom,
      email: ens.utilisateur.email,
      telephone: ens.telephone || '',
    });
    setModaleEdit(true);
  }

  async function soumettreEdit(e) {
    e.preventDefault();
    setErreur('');
    try {
      await api.put(`/enseignants/${editionId}`, formulaire);
      setModaleEdit(false);
      setMessage('Enseignant mis à jour');
      await chargerEnseignants();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  }

  function ouvrirMatieres(ens) {
    setEnseignantSelectionne(ens);
    setMatieresSelectionnees(
      (ens.matieres || []).map((m) => m.matiereId || m.matiere?.id || m.id)
    );
    setModaleMatieres(true);
  }

  function toggleMatiere(id) {
    setMatieresSelectionnees((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function soumettreMatieres(e) {
    e.preventDefault();
    setErreur('');
    try {
      await api.patch(`/enseignants/${enseignantSelectionne.id}/matieres`, {
        matiereIds: matieresSelectionnees,
      });
      setModaleMatieres(false);
      setMessage('Matières mises à jour');
      await chargerEnseignants();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'assignation des matières");
    }
  }

  async function reinitialiser(ens) {
    if (
      !confirm(
        `Réinitialiser le mot de passe de ${ens.utilisateur.nom} ${ens.utilisateur.prenom} ?`
      )
    ) {
      return;
    }
    try {
      const { data } = await api.post(`/enseignants/${ens.id}/reset-password`);
      setMdpTemporaire({
        email: ens.utilisateur.email,
        mdp: data.motDePasseTemporaire,
      });
      setMessage('Mot de passe réinitialisé.');
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la réinitialisation');
    }
  }

  async function supprimer(ens) {
    if (
      !confirm(
        `Supprimer définitivement ${ens.utilisateur.nom} ${ens.utilisateur.prenom} ?`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/enseignants/${ens.id}`);
      setMessage('Enseignant supprimé');
      await chargerEnseignants();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  function exporterCSV() {
    const rows = [['Nom', 'Prénom', 'Email', 'Téléphone', 'Matières']];
    for (const e of filtrés) {
      rows.push([
        e.utilisateur.nom,
        e.utilisateur.prenom,
        e.utilisateur.email || '',
        e.telephone || '',
        (e.matieres || []).map((m) => m.matiere?.nom || m.matiereId).join('; '),
      ]);
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enseignants.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const inputClass =
    'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30';

  return (
    <div className="p-4 sm:p-8 min-h-full">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-1">
            Personnel
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enseignants</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtrés.length} enseignant{filtrés.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exporterCSV}
            className="px-3.5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            Exporter CSV
          </button>
          <button
            onClick={ouvrirAjout}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-700/20 transition"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {message && (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm mb-4">
          {message}
        </p>
      )}
      {erreur && !modaleAjout && !modaleEdit && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
          {erreur}
        </p>
      )}

      {/* Mot de passe temporaire */}
      {mdpTemporaire && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm shadow-sm">
          <p className="font-semibold text-amber-900 mb-1">Identifiants à communiquer</p>
          <p className="text-amber-800">
            Email : <strong>{mdpTemporaire.email}</strong>
          </p>
          <p className="text-amber-800 mt-1">
            Mot de passe temporaire :{' '}
            <strong className="text-base tracking-wide font-mono bg-white/60 px-2 py-0.5 rounded">
              {mdpTemporaire.mdp}
            </strong>
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Notez-le maintenant : il ne sera plus affiché ensuite.
          </p>
          <button
            type="button"
            onClick={() => setMdpTemporaire(null)}
            className="mt-2 text-xs font-medium text-amber-700 underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Recherche */}
      <div className="mb-5 relative max-w-md">
        <input
          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          placeholder="Rechercher par nom, prénom ou email…"
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value);
            setPage(1);
          }}
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
      </div>

      {chargement ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : affichage.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-500 text-sm">
          Aucun enseignant trouvé.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Prénom</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Téléphone</th>
                  <th className="px-4 py-3 font-semibold">Matières</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {affichage.map((e) => (
                  <tr key={e.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{e.utilisateur.nom}</td>
                    <td className="px-4 py-3 text-slate-700">{e.utilisateur.prenom}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{e.utilisateur.email}</td>
                    <td className="px-4 py-3 text-slate-600">{e.telephone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(e.matieres || []).length === 0 ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : (
                          (e.matieres || []).map((m) => (
                            <span
                              key={m.id || m.matiere?.id}
                              className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100"
                            >
                              {m.matiere?.nom || ''}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <button
                          onClick={() => ouvrirVoir(e)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => ouvrirEdit(e)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => ouvrirMatieres(e)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
                        >
                          Matières
                        </button>
                        <button
                          onClick={() => reinitialiser(e)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          Réinit. mdp
                        </button>
                        <button
                          onClick={() => supprimer(e)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                        >
                          Suppr.
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtrés.length > PAGE_TAILLE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Page {page} / {pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modale ajout */}
      {modaleAjout && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Ajouter un enseignant</h2>
            </div>
            <form onSubmit={soumettreAjout} className="p-6 space-y-4">
              {erreur && (
                <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                  {erreur}
                </p>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Nom *
                </label>
                <input
                  className={inputClass}
                  value={formulaire.nom}
                  onChange={(e) => majChamp('nom', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Prénom *
                </label>
                <input
                  className={inputClass}
                  value={formulaire.prenom}
                  onChange={(e) => majChamp('prenom', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={formulaire.email}
                  onChange={(e) => majChamp('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Téléphone
                </label>
                <input
                  className={inputClass}
                  value={formulaire.telephone}
                  onChange={(e) => majChamp('telephone', e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">
                Un mot de passe temporaire sera généré et affiché une seule fois après la création.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModaleAjout(false)}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-700/20 transition"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale voir */}
      {modaleVoir && enseignantSelectionne && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Détails enseignant</h2>
            </div>
            <div className="p-6 space-y-3">
              <p className="font-semibold text-slate-900 text-base">
                {enseignantSelectionne.utilisateur.nom} {enseignantSelectionne.utilisateur.prenom}
              </p>
              <p className="text-sm text-slate-600">{enseignantSelectionne.utilisateur.email}</p>
              <p className="text-sm text-slate-600">
                {enseignantSelectionne.telephone || 'Pas de téléphone'}
              </p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Matières
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(enseignantSelectionne.matieres || []).length === 0 ? (
                    <span className="text-sm text-slate-400">Aucune</span>
                  ) : (
                    (enseignantSelectionne.matieres || []).map((m) => (
                      <span
                        key={m.id || m.matiere?.id}
                        className="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100"
                      >
                        {m.matiere?.nom || m.matiereId}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <a
                  href={`/emploi-du-temps?enseignantId=${enseignantSelectionne.id}`}
                  className="px-3 py-2 rounded-xl border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition"
                >
                  Emploi du temps
                </a>
                <button
                  onClick={() => setModaleVoir(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale edit */}
      {modaleEdit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Modifier enseignant</h2>
            </div>
            <form onSubmit={soumettreEdit} className="p-6 space-y-4">
              {erreur && (
                <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                  {erreur}
                </p>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Nom *
                </label>
                <input
                  className={inputClass}
                  value={formulaire.nom}
                  onChange={(e) => majChamp('nom', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Prénom *
                </label>
                <input
                  className={inputClass}
                  value={formulaire.prenom}
                  onChange={(e) => majChamp('prenom', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={formulaire.email}
                  onChange={(e) => majChamp('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Téléphone
                </label>
                <input
                  className={inputClass}
                  value={formulaire.telephone}
                  onChange={(e) => majChamp('telephone', e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModaleEdit(false)}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-700/20 transition"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale matières */}
      {modaleMatieres && enseignantSelectionne && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-slate-900">
                Matières — {enseignantSelectionne.utilisateur.nom}{' '}
                {enseignantSelectionne.utilisateur.prenom}
              </h2>
            </div>
            <form onSubmit={soumettreMatieres} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {matieres.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 cursor-pointer transition ${
                      matieresSelectionnees.includes(m.id)
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={matieresSelectionnees.includes(m.id)}
                      onChange={() => toggleMatiere(m.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-800">{m.nom}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModaleMatieres(false)}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 shadow-lg shadow-violet-600/20 transition"
                >
                  Sauver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}