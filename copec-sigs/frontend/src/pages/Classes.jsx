import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [anneeScolaireId, setAnneeScolaireId] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);

  const [formulaire, setFormulaire] = useState({ nom: '', niveauId: '', enseignantPrincipal: '' });
  const [enseignants, setEnseignants] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [editingId, setEditingId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState(null);

  async function chargerClasses() {
    try {
      const { data } = await api.get('/classes');
      setClasses(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement');
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/classes'),
      api.get('/niveaux'),
      api.get('/annees-scolaires'),
      api.get('/enseignants'),
    ])
      .then(([resClasses, resNiveaux, resAnnees, resEns]) => {
        setClasses(resClasses.data);
        setNiveaux(resNiveaux.data);
        setEnseignants(resEns.data || []);
        const anneeActive = resAnnees.data.find((a) => a.active) || resAnnees.data[0];
        if (anneeActive) setAnneeScolaireId(anneeActive.id);
        else setErreur("Aucune année scolaire n'existe encore — contacte l'administrateur.");
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  function ouvrirModale() {
    setFormulaire({ nom: '', niveauId: niveaux[0]?.id || '', enseignantPrincipal: '' });
    setEditingId(null);
    setErreur('');
    setModaleOuverte(true);
  }

  function majChamp(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur }));
  }

  function ouvrirModaleEdit(classe) {
    setEditingId(classe.id);
    setFormulaire({
      nom: classe.nom || '',
      niveauId: classe.niveauId || niveaux[0]?.id || '',
      enseignantPrincipal: classe.enseignantPrincipal || '',
    });
    setErreur('');
    setModaleOuverte(true);
  }

  async function supprimerClasse(id) {
    if (!confirm('Confirmer la suppression de cette classe ?')) return;
    try {
      await api.delete(`/classes/${id}`);
      await chargerClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  async function dupliquerClasse(classe) {
    try {
      await api.post('/classes', {
        nom: `${classe.nom} (copie)`,
        niveauId: classe.niveauId,
        anneeScolaireId,
      });
      await chargerClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la duplication');
    }
  }

  async function voirClasse(id) {
    try {
      const { data } = await api.get(`/classes/${id}`);
      setDetailsData(data);
      setDetailsModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors du chargement de la classe');
    }
  }

  async function exportRoster(id) {
    try {
      if (!id) {
        const rows = [];
        for (const c of filteredClasses) {
          const { data } = await api.get(`/classes/${c.id}`);
          (data.inscriptions || []).forEach((r) =>
            rows.push([r.eleve.matricule, r.eleve.nom, r.eleve.prenom])
          );
        }
        const header = ['matricule', 'nom', 'prenom'];
        const csv = [
          header.join(';'),
          ...rows.map((r) =>
            r.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(';')
          ),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'classes-roster.csv';
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const { data } = await api.get(`/classes/${id}`);
      const list = data.inscriptions || [];
      const header = ['matricule', 'nom', 'prenom'];
      const rows = list.map((r) => [r.eleve.matricule, r.eleve.nom, r.eleve.prenom]);
      const csv = [
        header.join(';'),
        ...rows.map((r) =>
          r.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(';')
        ),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.nom || 'classe'}-roster.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur export');
    }
  }

  async function soumettre(e) {
    e.preventDefault();
    if (!anneeScolaireId) {
      setErreur('Aucune année scolaire disponible, impossible de créer une classe.');
      return;
    }
    setEnregistrement(true);
    setErreur('');
    try {
      if (editingId) {
        await api.put(`/classes/${editingId}`, {
          nom: formulaire.nom,
          niveauId: formulaire.niveauId,
          enseignantPrincipal: formulaire.enseignantPrincipal,
        });
      } else {
        await api.post('/classes', { ...formulaire, anneeScolaireId });
      }
      setModaleOuverte(false);
      setEditingId(null);
      await chargerClasses();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  const filteredClasses = useMemo(() => {
    const q = (recherche || '').trim().toLowerCase();
    if (!q) return classes || [];
    return (classes || []).filter(
      (c) =>
        (c.nom || '').toLowerCase().includes(q) ||
        (c.niveau?.libelle || '').toLowerCase().includes(q)
    );
  }, [classes, recherche]);

  const totalPages = Math.max(1, Math.ceil((filteredClasses || []).length / perPage));
  const displayed = (filteredClasses || []).slice((page - 1) * perPage, page * perPage);

  if (chargement) {
    return (
      <div className="p-8 min-h-full flex justify-center items-center">
        <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-full">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-1">
            Organisation
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Classes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredClasses.length} classe{filteredClasses.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <input
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher nom / niveau…"
              className="border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-52"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
          </div>
          <button
            onClick={() => exportRoster(null)}
            className="px-3.5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            Exporter CSV
          </button>
          <button
            onClick={ouvrirModale}
            disabled={niveaux.length === 0 || !anneeScolaireId}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
          >
            + Créer une classe
          </button>
        </div>
      </div>

      {erreur && !modaleOuverte && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
          {erreur}
        </p>
      )}

      {!classes || classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-500 text-sm">Aucune classe créée pour l’instant.</p>
          <button
            onClick={ouvrirModale}
            disabled={niveaux.length === 0 || !anneeScolaireId}
            className="mt-4 text-sm font-medium text-blue-700 hover:underline"
          >
            Créer la première classe
          </button>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-500 text-sm">
          Aucun résultat pour « {recherche} »
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Niveau</th>
                  <th className="px-4 py-3 font-semibold">Cycle</th>
                  <th className="px-4 py-3 font-semibold">Effectif</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map((classe) => (
                  <tr key={classe.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{classe.nom}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {classe.niveau?.libelle}
                      {classe.niveau?.filiere ? ` — ${classe.niveau.filiere}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {classe.niveau?.cycle}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                        {classe._count?.inscriptions ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <button
                          onClick={() => voirClasse(classe.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => ouvrirModaleEdit(classe)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => dupliquerClasse(classe)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50 transition"
                        >
                          Dupliquer
                        </button>
                        <button
                          onClick={() => exportRoster(classe.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => supprimerClasse(classe.id)}
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

          {filteredClasses.length > perPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Page {page} / {totalPages}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modale création / édition */}
      {modaleOuverte && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Modifier une classe' : 'Créer une classe'}
              </h2>
            </div>
            <form onSubmit={soumettre} className="p-6 space-y-4">
              {erreur && (
                <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                  {erreur}
                </p>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Niveau
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={formulaire.niveauId}
                  onChange={(e) => majChamp('niveauId', e.target.value)}
                  required
                >
                  {niveaux.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.libelle}
                      {n.filiere ? ` — ${n.filiere}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Nom de la classe
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="ex. 6ème A"
                  value={formulaire.nom}
                  onChange={(e) => majChamp('nom', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Enseignant principal (optionnel)
                </label>
                {enseignants.length > 0 ? (
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formulaire.enseignantPrincipal}
                    onChange={(e) => majChamp('enseignantPrincipal', e.target.value)}
                  >
                    <option value="">— Aucun —</option>
                    {enseignants.map((ens) => (
                      <option
                        key={ens.id}
                        value={`${ens.utilisateur.nom} ${ens.utilisateur.prenom}`}
                      >
                        {ens.utilisateur.nom} {ens.utilisateur.prenom}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formulaire.enseignantPrincipal}
                    onChange={(e) => majChamp('enseignantPrincipal', e.target.value)}
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModaleOuverte(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enregistrement}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
                >
                  {enregistrement
                    ? 'Enregistrement…'
                    : editingId
                      ? 'Enregistrer'
                      : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale détails */}
      {detailsModalOpen && detailsData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Détails : {detailsData.nom}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {detailsData.niveau?.libelle}
                {detailsData.niveau?.filiere ? ` — ${detailsData.niveau.filiere}` : ''}
              </p>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Effectif ({detailsData.inscriptions?.length || 0})
              </h3>
              {(detailsData.inscriptions || []).length === 0 ? (
                <p className="text-sm text-slate-400">Aucun élève inscrit.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-semibold">Matricule</th>
                      <th className="pb-2 font-semibold">Nom</th>
                      <th className="pb-2 font-semibold">Prénom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailsData.inscriptions.map((i) => (
                      <tr key={i.id}>
                        <td className="py-2.5 font-mono text-xs text-slate-600">
                          {i.eleve.matricule}
                        </td>
                        <td className="py-2.5 font-medium text-slate-900">{i.eleve.nom}</td>
                        <td className="py-2.5 text-slate-700">{i.eleve.prenom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDetailsModalOpen(false);
                  setDetailsData(null);
                }}
                className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                Fermer
              </button>
              <button
                onClick={() => exportRoster(detailsData.id)}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 transition"
              >
                Exporter CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}