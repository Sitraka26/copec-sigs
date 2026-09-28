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

const COULEURS_STATUT = {
  OUVERTE: 'bg-amber-50 text-amber-800 border-amber-200',
  EN_COURS: 'bg-blue-50 text-blue-700 border-blue-200',
  TRAITEE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJETEE: 'bg-red-50 text-red-700 border-red-200',
};

export default function Notes() {
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [periode, setPeriode] = useState(1);

  const [grille, setGrille] = useState(null);
  const [valeurs, setValeurs] = useState({});
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [reclamations, setReclamations] = useState([]);
  const [reclamationOuverte, setReclamationOuverte] = useState(null);
  const [motifReclamation, setMotifReclamation] = useState('');
  const [filtreReclamations, setFiltreReclamations] = useState('TOUTES');
  const role = JSON.parse(localStorage.getItem('utilisateur') || 'null')?.role;
  const peutTraiter = ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'].includes(role);

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/matieres')])
      .then(([resClasses, resMatieres]) => {
        setClasses(resClasses.data);
        setMatieres(resMatieres.data);
        if (resClasses.data.length > 0) setClasseId(resClasses.data[0].id);
        if (resMatieres.data.length > 0) setMatiereId(resMatieres.data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!classeId || !matiereId || !periode) return;
    setErreur('');
    setMessageSucces('');
    api
      .get('/notes/saisie', { params: { classeId, matiereId, periode } })
      .then(({ data }) => {
        setGrille(data);
        const initiales = {};
        data.eleves.forEach((e) => {
          initiales[e.eleveId] = e.note ?? '';
        });
        setValeurs(initiales);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement de la grille'));
  }, [classeId, matiereId, periode]);

  async function chargerReclamations() {
    try {
      const { data } = await api.get('/notes/reclamations');
      setReclamations(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement des réclamations');
    }
  }

  useEffect(() => {
    chargerReclamations();
  }, []);

  function majNote(eleveId, valeur) {
    setValeurs((v) => ({ ...v, [eleveId]: valeur }));
  }

  async function enregistrer() {
    setEnregistrement(true);
    setErreur('');
    setMessageSucces('');
    try {
      const notes = Object.entries(valeurs)
        .filter(([, v]) => v !== '' && v !== null)
        .map(([eleveId, v]) => ({ eleveId, valeur: parseFloat(v) }));

      await api.post('/notes/saisie', { classeId, matiereId, periode, notes });
      setMessageSucces('Notes enregistrées avec succès.');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function soumettreReclamation(e) {
    e.preventDefault();
    if (!reclamationOuverte || !motifReclamation.trim()) return;
    try {
      await api.post('/notes/reclamations', {
        eleveId: reclamationOuverte.eleveId,
        matiereId,
        periode,
        motif: motifReclamation,
      });
      setReclamationOuverte(null);
      setMotifReclamation('');
      setMessageSucces('Réclamation envoyée.');
      await chargerReclamations();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'envoi de la réclamation");
    }
  }

  async function traiterReclamation(reclamation, statut) {
    const reponse = window.prompt('Réponse (optionnelle) :', reclamation.reponse || '');
    if (reponse === null) return;
    try {
      await api.patch(`/notes/reclamations/${reclamation.id}`, { statut, reponse });
      await chargerReclamations();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de traitement');
    }
  }

  function exporterReclamations() {
    const lignes = [['Élève', 'Matière', 'Bimestre', 'Motif', 'Statut', 'Date']];
    reclamations.forEach((r) =>
      lignes.push([
        `${r.eleve.nom} ${r.eleve.prenom}`,
        r.matiere.nom,
        NOMS_PERIODES[r.periode],
        r.motif,
        r.statut,
        new Date(r.createdAt).toLocaleDateString('fr-FR'),
      ])
    );
    const csv = lignes
      .map((ligne) => ligne.map((cellule) => `"${String(cellule).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'reclamations-notes.csv';
    lien.click();
    URL.revokeObjectURL(url);
  }

  const reclamationsFiltrees = reclamations.filter(
    (r) => filtreReclamations === 'TOUTES' || r.statut === filtreReclamations
  );

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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saisie des notes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Grille de notes par classe, matière et bimestre
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap gap-4">
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
              Matière
            </label>
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[180px]"
              value={matiereId}
              onChange={(e) => setMatiereId(e.target.value)}
            >
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom} (coef. {m.coefficient})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Période
            </label>
            <select
              className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[150px]"
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

      {grille && grille.eleves.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-500 text-sm">
          Aucun élève inscrit dans cette classe.
        </div>
      )}

      {grille && grille.eleves.length > 0 && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Matricule</th>
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">Prénom</th>
                    <th className="px-4 py-3 font-semibold w-40">Note / 20</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {grille.eleves.map((eleve) => (
                    <tr key={eleve.eleveId} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {eleve.matricule}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{eleve.nom}</td>
                      <td className="px-4 py-3 text-slate-700">{eleve.prenom}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            className="w-20 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            value={valeurs[eleve.eleveId] ?? ''}
                            onChange={(e) => majNote(eleve.eleveId, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setReclamationOuverte(eleve)}
                            className="text-xs font-medium text-orange-600 hover:text-orange-800 hover:underline"
                          >
                            Réclamer
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
            onClick={enregistrer}
            disabled={enregistrement}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
          >
            {enregistrement ? 'Enregistrement…' : 'Enregistrer les notes'}
          </button>
        </>
      )}

      {/* Réclamations */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Réclamations de notes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {reclamationsFiltrees.length} réclamation
              {reclamationsFiltrees.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={filtreReclamations}
              onChange={(e) => setFiltreReclamations(e.target.value)}
            >
              <option value="TOUTES">Toutes</option>
              <option value="OUVERTE">Ouvertes</option>
              <option value="EN_COURS">En cours</option>
              <option value="TRAITEE">Traitées</option>
              <option value="REJETEE">Rejetées</option>
            </select>
            <button
              onClick={exporterReclamations}
              className="px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              Exporter
            </button>
          </div>
        </div>

        {reclamationsFiltrees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-sm">
            Aucune réclamation.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Élève</th>
                    <th className="px-4 py-3 font-semibold">Matière</th>
                    <th className="px-4 py-3 font-semibold">Motif</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reclamationsFiltrees.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {r.eleve.nom} {r.eleve.prenom}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.matiere.nom}
                        <span className="text-slate-400 text-xs ml-1">
                          · {NOMS_PERIODES[r.periode]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{r.motif}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            COULEURS_STATUT[r.statut] ||
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {r.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {peutTraiter && r.statut !== 'TRAITEE' && r.statut !== 'REJETEE' && (
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            <button
                              onClick={() => traiterReclamation(r, 'EN_COURS')}
                              className="px-2 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                            >
                              En cours
                            </button>
                            <button
                              onClick={() => traiterReclamation(r, 'TRAITEE')}
                              className="px-2 py-1 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                            >
                              Traiter
                            </button>
                            <button
                              onClick={() => traiterReclamation(r, 'REJETEE')}
                              className="px-2 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                            >
                              Rejeter
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Modale réclamation */}
      {reclamationOuverte && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={soumettreReclamation}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Réclamer une note</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {reclamationOuverte.nom} {reclamationOuverte.prenom} — {grille?.matiere?.nom},{' '}
                {NOMS_PERIODES[periode]}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm min-h-24 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Expliquez la réclamation…"
                value={motifReclamation}
                onChange={(e) => setMotifReclamation(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReclamationOuverte(null)}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-lg shadow-orange-600/20 transition"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}