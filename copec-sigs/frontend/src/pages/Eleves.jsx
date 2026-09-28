import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const CHAMPS_VIDES = {
  matricule: '',
  nom: '',
  prenom: '',
  dateNaissance: '',
  sexe: 'M',
  adresse: '',
  contactUrgenceNom: '',
  contactUrgenceTel: '',
};

export default function Eleves() {
  const [eleves, setEleves] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [formulaire, setFormulaire] = useState(CHAMPS_VIDES);
  const [enregistrement, setEnregistrement] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);

  async function chargerEleves() {
    setChargement(true);
    try {
      const { data } = await api.get('/eleves');
      setEleves(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement des élèves');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerEleves();
  }, []);

  function ouvrirModale() {
    setFormulaire(CHAMPS_VIDES);
    setEditingId(null);
    setViewOnly(false);
    setErreur('');
    setModaleOuverte(true);
  }

  async function soumettre(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    try {
      if (editingId) {
        await api.put(`/eleves/${editingId}`, formulaire);
      } else {
        await api.post('/eleves', formulaire);
      }
      setModaleOuverte(false);
      setEditingId(null);
      setViewOnly(false);
      await chargerEleves();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  function majChamp(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur }));
  }

  function ouvrirModaleEdit(eleve, view = false) {
    setFormulaire({
      matricule: eleve.matricule || '',
      nom: eleve.nom || '',
      prenom: eleve.prenom || '',
      dateNaissance: eleve.dateNaissance ? eleve.dateNaissance.split('T')[0] : '',
      sexe: eleve.sexe || 'M',
      adresse: eleve.adresse || '',
      contactUrgenceNom: eleve.contactUrgenceNom || '',
      contactUrgenceTel: eleve.contactUrgenceTel || '',
    });
    setEditingId(eleve.id);
    setViewOnly(!!view);
    setErreur('');
    setModaleOuverte(true);
  }

  async function supprimerEleve(id) {
    if (!confirm('Confirmer la suppression de cet élève ?')) return;
    try {
      await api.delete(`/eleves/${id}`);
      await chargerEleves();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  function exportCSV(list) {
    const header = [
      'matricule',
      'nom',
      'prenom',
      'dateNaissance',
      'sexe',
      'adresse',
      'contactUrgenceNom',
      'contactUrgenceTel',
    ];
    const rows = list.map((r) => header.map((h) => (r[h] ?? '').toString()));
    const csv = [
      header.join(';'),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eleves.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(id) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(filtered.map((e) => e.id));
      setSelectAll(true);
    }
  }

  async function supprimerSelection() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Confirmer la suppression de ${selectedIds.length} élève(s) ?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/eleves/${id}`)));
      setSelectedIds([]);
      setSelectAll(false);
      await chargerEleves();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression en masse');
    }
  }

  const filtered = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return eleves;
    return eleves.filter((e) =>
      [e.matricule, e.nom, e.prenom, e.contactUrgenceTel, e.adresse].some((v) =>
        (v || '').toString().toLowerCase().includes(q)
      )
    );
  }, [eleves, recherche]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const displayed = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-4 sm:p-8 min-h-full">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-1">
            Gestion
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Élèves</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} élève{filtered.length > 1 ? 's' : ''}
            {recherche ? ' trouvé(s)' : ' enregistré(s)'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={supprimerSelection}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition"
            >
              Supprimer ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => exportCSV(filtered)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            Exporter CSV
          </button>
          <button
            onClick={ouvrirModale}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-700/20 transition"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <input
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par matricule, nom, prénom…"
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
        </div>
      </div>

      {erreur && !modaleOuverte && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : eleves.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-500 text-sm">Aucun élève enregistré pour l&apos;instant.</p>
          <button
            onClick={ouvrirModale}
            className="mt-4 text-sm font-medium text-blue-700 hover:underline"
          >
            Ajouter le premier élève
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-500 text-sm">
          Aucun résultat pour « {recherche} »
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Matricule</th>
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Prénom</th>
                  <th className="px-4 py-3 font-semibold">Sexe</th>
                  <th className="px-4 py-3 font-semibold">Naissance</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map((eleve) => (
                  <tr key={eleve.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(eleve.id)}
                        onChange={() => toggleSelect(eleve.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{eleve.matricule}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{eleve.nom}</td>
                    <td className="px-4 py-3 text-slate-700">{eleve.prenom}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          eleve.sexe === 'F'
                            ? 'bg-pink-50 text-pink-700'
                            : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {eleve.sexe === 'F' ? 'F' : 'M'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {eleve.dateNaissance
                        ? new Date(eleve.dateNaissance).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <button
                          onClick={() => ouvrirModaleEdit(eleve, true)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => ouvrirModaleEdit(eleve)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => supprimerEleve(eleve.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                        >
                          Suppr.
                        </button>
                        {eleve.contactUrgenceTel && (
                          <a
                            href={`tel:${eleve.contactUrgenceTel}`}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            Appeler
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > perPage && (
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

      {/* Modale */}
      {modaleOuverte && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {viewOnly ? 'Détail élève' : editingId ? 'Modifier un élève' : 'Ajouter un élève'}
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
                  Matricule *
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                  value={formulaire.matricule}
                  onChange={(e) => majChamp('matricule', e.target.value)}
                  required
                  disabled={viewOnly}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    Nom *
                  </label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    value={formulaire.nom}
                    onChange={(e) => majChamp('nom', e.target.value)}
                    required
                    disabled={viewOnly}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    Prénom *
                  </label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    value={formulaire.prenom}
                    onChange={(e) => majChamp('prenom', e.target.value)}
                    required
                    disabled={viewOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    value={formulaire.dateNaissance}
                    onChange={(e) => majChamp('dateNaissance', e.target.value)}
                    required
                    disabled={viewOnly}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    Sexe *
                  </label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    value={formulaire.sexe}
                    onChange={(e) => majChamp('sexe', e.target.value)}
                    disabled={viewOnly}
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Adresse
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                  value={formulaire.adresse}
                  onChange={(e) => majChamp('adresse', e.target.value)}
                  disabled={viewOnly}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    Contact urgence (nom)
                  </label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    value={formulaire.contactUrgenceNom}
                    onChange={(e) => majChamp('contactUrgenceNom', e.target.value)}
                    disabled={viewOnly}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    Contact urgence (tél.)
                  </label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                    value={formulaire.contactUrgenceTel}
                    onChange={(e) => majChamp('contactUrgenceTel', e.target.value)}
                    disabled={viewOnly}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModaleOuverte(false);
                    setEditingId(null);
                    setViewOnly(false);
                  }}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  {viewOnly ? 'Fermer' : 'Annuler'}
                </button>
                {!viewOnly && (
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
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}