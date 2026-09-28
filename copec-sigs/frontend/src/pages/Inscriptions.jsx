import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const COULEURS_STATUT = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TRANSFEREE: 'bg-blue-50 text-blue-700 border-blue-200',
  ABANDONNEE: 'bg-red-50 text-red-700 border-red-200',
  DIPLOMEE: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function Inscriptions() {
  const [classes, setClasses] = useState([]);
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [detailClasse, setDetailClasse] = useState(null);
  const [tousLesEleves, setTousLesEleves] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [eleveChoisi, setEleveChoisi] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/eleves')])
      .then(([resClasses, resEleves]) => {
        setClasses(resClasses.data);
        setTousLesEleves(resEleves.data);
        if (resClasses.data.length > 0) setClasseSelectionnee(resClasses.data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!classeSelectionnee) return;
    setPage(1);
    api
      .get(`/classes/${classeSelectionnee}`)
      .then(({ data }) => setDetailClasse(data))
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement de la classe'));
  }, [classeSelectionnee]);

  const idsDejaInscrits = new Set((detailClasse?.inscriptions || []).map((i) => i.eleve.id));
  const elevesDisponibles = tousLesEleves.filter((e) => !idsDejaInscrits.has(e.id));

  const filtered = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const list = detailClasse?.inscriptions || [];
    if (!q) return list;
    return list.filter((i) =>
      [i.eleve.matricule, i.eleve.nom, i.eleve.prenom].some((v) =>
        (v || '').toString().toLowerCase().includes(q)
      )
    );
  }, [detailClasse, recherche]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const displayed = filtered.slice((page - 1) * perPage, page * perPage);

  async function changerStatut(inscriptionId, statut) {
    try {
      await api.patch(`/inscriptions/${inscriptionId}/statut`, { statut });
      const { data } = await api.get(`/classes/${classeSelectionnee}`);
      setDetailClasse(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors du changement de statut');
    }
  }

  async function transferer(inscriptionId) {
    const liste = classes.map((c) => `${c.id}: ${c.nom}`).join('\n');
    const choix = prompt(`Classes disponibles (id : nom)\n${liste}\n\nEntrer l'id de la classe cible:`);
    if (!choix) return;
    try {
      await api.patch(`/inscriptions/${inscriptionId}/classe`, { classeId: choix });
      const { data } = await api.get(`/classes/${classeSelectionnee}`);
      setDetailClasse(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors du transfert');
    }
  }

  async function desinscrire(inscriptionId) {
    if (!confirm('Confirmer la désinscription de cet élève ?')) return;
    await changerStatut(inscriptionId, 'ABANDONNEE');
  }

  function exportCSV(list) {
    const header = ['matricule', 'nom', 'prenom', 'statut', 'classe'];
    const rows = list.map((r) => [
      r.eleve.matricule,
      r.eleve.nom,
      r.eleve.prenom,
      r.statut,
      r.classe?.nom || detailClasse?.nom || '',
    ]);
    const csv = [
      header.join(';'),
      ...rows.map((r) => r.map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(';')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inscriptions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function inscrire(e) {
    e.preventDefault();
    if (!eleveChoisi) return;
    setEnregistrement(true);
    setErreur('');
    try {
      await api.post('/inscriptions', {
        eleveId: eleveChoisi,
        classeId: classeSelectionnee,
        anneeScolaireId: detailClasse.anneeScolaireId,
      });
      const { data } = await api.get(`/classes/${classeSelectionnee}`);
      setDetailClasse(data);
      setModaleOuverte(false);
      setEleveChoisi('');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'inscription");
    } finally {
      setEnregistrement(false);
    }
  }

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
            Scolarité
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestion des inscriptions par classe
          </p>
        </div>
      </div>

      {erreur && !modaleOuverte && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">{erreur}</p>
      )}

      {/* Sélecteur de classe */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 max-w-sm">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Classe
        </label>
        <select
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          value={classeSelectionnee}
          onChange={(e) => setClasseSelectionnee(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom} ({c.niveau?.libelle})
            </option>
          ))}
        </select>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="font-semibold text-slate-800 text-sm">
          Élèves inscrits{' '}
          {detailClasse && (
            <span className="text-slate-400 font-normal">
              ({detailClasse.inscriptions?.length || 0})
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <input
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher matricule / nom…"
              className="border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-52"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
          </div>
          <button
            onClick={() => exportCSV(filtered)}
            className="px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            Exporter CSV
          </button>
          <button
            onClick={() => setModaleOuverte(true)}
            disabled={!classeSelectionnee}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
          >
            + Inscrire un élève
          </button>
        </div>
      </div>

      {/* Tableau */}
      {detailClasse && filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-500 text-sm">
            {recherche
              ? `Aucun résultat pour « ${recherche} »`
              : 'Aucun élève inscrit dans cette classe pour l’instant.'}
          </p>
        </div>
      ) : (
        detailClasse &&
        filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Matricule</th>
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">Prénom</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map((insc) => (
                    <tr key={insc.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {insc.eleve.matricule}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{insc.eleve.nom}</td>
                      <td className="px-4 py-3 text-slate-700">{insc.eleve.prenom}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            COULEURS_STATUT[insc.statut] || 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {insc.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button
                            onClick={() =>
                              alert(
                                `Élève : ${insc.eleve.nom} ${insc.eleve.prenom}\nMatricule : ${insc.eleve.matricule}\nStatut : ${insc.statut}`
                              )
                            }
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                          >
                            Voir
                          </button>
                          <button
                            onClick={() => transferer(insc.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                          >
                            Transférer
                          </button>
                          <button
                            onClick={() => {
                              const choix = prompt(
                                'Nouveau statut (ACTIVE, TRANSFEREE, ABANDONNEE, DIPLOMEE) :',
                                insc.statut
                              );
                              if (choix) changerStatut(insc.id, choix);
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
                          >
                            Statut
                          </button>
                          <button
                            onClick={() => desinscrire(insc.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                          >
                            Désinscrire
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
        )
      )}

      {/* Modale inscription */}
      {modaleOuverte && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Inscrire un élève</h2>
              {detailClasse && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Classe : {detailClasse.nom}
                </p>
              )}
            </div>
            <div className="p-6">
              {elevesDisponibles.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  Tous les élèves sont déjà inscrits dans cette classe.
                </p>
              ) : (
                <form onSubmit={inscrire} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Élève
                    </label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={eleveChoisi}
                      onChange={(e) => setEleveChoisi(e.target.value)}
                      required
                    >
                      <option value="">— Choisir —</option>
                      {elevesDisponibles.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nom} {e.prenom} ({e.matricule})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setModaleOuverte(false)}
                      className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={enregistrement}
                      className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
                    >
                      {enregistrement ? 'Inscription…' : 'Inscrire'}
                    </button>
                  </div>
                </form>
              )}
              {elevesDisponibles.length === 0 && (
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setModaleOuverte(false)}
                    className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}