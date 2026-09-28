import { useEffect, useState } from 'react';
import api from '../api/client';

const PERIODES = [1, 2, 3, 4, 5];
const NOMS_PERIODES = {
  1: '1er Bimestre',
  2: '2ème Bimestre',
  3: '3ème Bimestre',
  4: '4ème Bimestre',
  5: '5ème Bimestre',
};

export default function Bulletins() {
  const [classes, setClasses] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [periode, setPeriode] = useState(1);

  const [apercu, setApercu] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [generation, setGeneration] = useState(false);
  const [telechargementId, setTelechargementId] = useState(null);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState('moyenne');
  const [selection, setSelection] = useState([]);
  const [detail, setDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => {
        setClasses(data);
        if (data.length > 0) setClasseId(data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  async function chargerApercu() {
    if (!classeId || !periode) return;
    setErreur('');
    try {
      const { data } = await api.get(`/bulletins/classe/${classeId}/periode/${periode}`);
      setApercu(data);
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur de chargement de l'aperçu");
    }
  }

  useEffect(() => {
    chargerApercu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeId, periode]);

  const classeSelectionnee = classes.find((c) => c.id === classeId);
  const resultatsFiltres = (apercu?.resultats || [])
    .filter((r) =>
      `${r.nom} ${r.prenom}`.toLowerCase().includes(recherche.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (tri === 'nom') return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
      if (tri === 'rang') return (a.rang ?? 9999) - (b.rang ?? 9999);
      return (b.moyenne ?? -1) - (a.moyenne ?? -1);
    });

  function basculerSelection(id) {
    setSelection((courante) =>
      courante.includes(id) ? courante.filter((item) => item !== id) : [...courante, id]
    );
  }

  function selectionnerTous() {
    setSelection(
      selection.length === resultatsFiltres.length ? [] : resultatsFiltres.map((r) => r.eleveId)
    );
  }

  async function ouvrirDetail(eleveId) {
    setChargementDetail(true);
    setErreur('');
    try {
      const { data } = await api.get(`/bulletins/eleve/${eleveId}/periode/${periode}`);
      setDetail(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement du détail');
    } finally {
      setChargementDetail(false);
    }
  }

  function exporterCSV() {
    const lignes = [['Nom', 'Prénom', 'Moyenne', 'Rang', 'Période']];
    resultatsFiltres.forEach((r) =>
      lignes.push([r.nom, r.prenom, r.moyenne ?? '', r.rang ?? '', NOMS_PERIODES[periode]])
    );
    const csv = lignes
      .map((ligne) => ligne.map((cellule) => `"${String(cellule).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `bulletins_${classeSelectionnee?.nom || 'classe'}_${periode}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  const avecMoyenne = resultatsFiltres.filter((r) => r.moyenne !== null);
  const moyenneClasse = avecMoyenne.length
    ? avecMoyenne.reduce((total, r) => total + r.moyenne, 0) / avecMoyenne.length
    : 0;
  const meilleureMoyenne = avecMoyenne.length
    ? Math.max(...avecMoyenne.map((r) => r.moyenne))
    : 0;

  async function genererBulletins() {
    setGeneration(true);
    setErreur('');
    setMessageSucces('');
    try {
      await api.post('/bulletins/generer', {
        classeId,
        anneeScolaireId: classeSelectionnee.anneeScolaireId,
        periode,
      });
      setMessageSucces('Bulletins générés et enregistrés avec succès.');
      await chargerApercu();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setGeneration(false);
    }
  }

  async function telechargerBulletinPdf(eleveId, nomComplet) {
    setTelechargementId(eleveId);
    try {
      const reponse = await api.get(
        `/bulletins/eleve/${eleveId}/annee/${classeSelectionnee.anneeScolaireId}/pdf`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([reponse.data], { type: 'application/pdf' }));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `bulletin_${nomComplet.replace(/\s+/g, '_')}.pdf`;
      lien.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErreur('Erreur lors du téléchargement du bulletin');
    } finally {
      setTelechargementId(null);
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
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-1">
          Évaluation
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bulletins</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Génère les moyennes et rangs d’une classe pour une période, puis télécharge le bulletin
          PDF de chaque élève.
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Classe
            </label>
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[140px]"
              value={classeId}
              onChange={(e) => setClasseId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Période
            </label>
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[160px]"
              value={periode}
              onChange={(e) => setPeriode(Number(e.target.value))}
            >
              {PERIODES.map((p) => (
                <option key={p} value={p}>
                  {NOMS_PERIODES[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Recherche
            </label>
            <input
              className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="Nom ou prénom…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <span className="absolute left-3 bottom-2.5 text-slate-400 text-sm">⌕</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Tri
            </label>
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={tri}
              onChange={(e) => setTri(e.target.value)}
            >
              <option value="moyenne">Par moyenne</option>
              <option value="rang">Par rang</option>
              <option value="nom">Par nom</option>
            </select>
          </div>
          <button
            onClick={exporterCSV}
            disabled={!resultatsFiltres.length}
            className="px-3.5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
          >
            Exporter CSV
          </button>
        </div>
      </div>

      {erreur && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
          {erreur}
        </p>
      )}
      {messageSucces && (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm mb-4">
          {messageSucces}
        </p>
      )}

      {apercu && apercu.resultats.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-500 text-sm">
          Aucun élève inscrit dans cette classe.
        </div>
      )}

      {apercu && apercu.resultats.length > 0 && (
        <>
                    {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 border-t-4 border-t-blue-500">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                Élèves affichés
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {resultatsFiltres.length}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 border-t-4 border-t-emerald-500">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                Moyenne de classe
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {moyenneClasse.toFixed(2)}
                <span className="text-slate-400 text-sm font-normal">/20</span>
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 border-t-4 border-t-amber-500">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                Meilleure moyenne
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {meilleureMoyenne.toFixed(2)}
                <span className="text-slate-400 text-sm font-normal">/20</span>
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 border-t-4 border-t-violet-500">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
                Sélectionnés
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {selection.length}
              </p>
            </div>
          </div>
          {/* Tableau */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          resultatsFiltres.length > 0 &&
                          selection.length === resultatsFiltres.length
                        }
                        onChange={selectionnerTous}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">Prénom</th>
                    <th className="px-4 py-3 font-semibold">Moyenne</th>
                    <th className="px-4 py-3 font-semibold">Rang</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {resultatsFiltres.map((r) => (
                    <tr key={r.eleveId} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selection.includes(r.eleveId)}
                          onChange={() => basculerSelection(r.eleveId)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.nom}</td>
                      <td className="px-4 py-3 text-slate-700">{r.prenom}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                        {r.moyenne !== null ? (
                          <>
                            {r.moyenne.toFixed(2)}
                            <span className="text-slate-400 font-normal text-xs">/20</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.rang != null ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                            {r.rang}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button
                            onClick={() => ouvrirDetail(r.eleveId)}
                            disabled={chargementDetail}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                          >
                            Détails
                          </button>
                          <button
                            onClick={() =>
                              telechargerBulletinPdf(r.eleveId, `${r.nom}_${r.prenom}`)
                            }
                            disabled={telechargementId === r.eleveId}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition"
                          >
                            {telechargementId === r.eleveId ? 'PDF…' : 'PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={genererBulletins}
            disabled={generation}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
          >
            {generation
              ? 'Génération…'
              : 'Générer et enregistrer les bulletins de cette période'}
          </button>
          <p className="text-xs text-slate-400 mt-2 max-w-xl">
            L’aperçu calcule les moyennes en temps réel. Génère les bulletins pour les
            enregistrer officiellement avant de télécharger un PDF cohérent.
          </p>
        </>
      )}

      {/* Modale détail */}
      {detail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-auto">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Détail du bulletin</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {detail.eleve.nom} {detail.eleve.prenom} — {NOMS_PERIODES[detail.periode]}
              </p>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-semibold">Matière</th>
                    <th className="pb-2 font-semibold">Note</th>
                    <th className="pb-2 font-semibold">Coef.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {detail.notes.map((note) => (
                    <tr key={note.matiere}>
                      <td className="py-2.5 text-slate-800">{note.matiere}</td>
                      <td className="py-2.5 font-semibold tabular-nums">
                        {note.valeur}
                        <span className="text-slate-400 font-normal text-xs">/20</span>
                      </td>
                      <td className="py-2.5 text-slate-600">{note.coefficient}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                Moyenne générale :{' '}
                <strong className="text-slate-900">{detail.moyenneGenerale ?? '—'}</strong>
                {' · '}
                Rang : <strong className="text-slate-900">{detail.rang ?? '—'}</strong>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setDetail(null)}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}