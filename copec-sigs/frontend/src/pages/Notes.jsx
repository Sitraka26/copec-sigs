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

export default function Notes() {
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [periode, setPeriode] = useState(1);

  const [grille, setGrille] = useState(null);
  const [valeurs, setValeurs] = useState({});
  const [chargement, setChargement] = useState(true);
  const [chargementMatieres, setChargementMatieres] = useState(false);
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
    api
      .get('/classes')
      .then(({ data }) => {
        setClasses(data);
        if (data.length > 0) setClasseId(data[0].id);
      })
      .catch((err) =>
        setErreur(err.response?.data?.error || 'Erreur de chargement des classes')
      )
      .finally(() => setChargement(false));
  }, []);

  // Matières = programme du niveau de la classe
  useEffect(() => {
    if (!classeId) {
      setMatieres([]);
      setMatiereId('');
      return;
    }

    const classe = classes.find((c) => c.id === classeId);
    const niveauId = classe?.niveauId || classe?.niveau?.id;

    if (!niveauId) {
      setMatieres([]);
      setMatiereId('');
      setErreur('Cette classe n’a pas de niveau associé.');
      return;
    }

    setChargementMatieres(true);
    setErreur('');
    setGrille(null);
    setMatiereId('');

    api
      .get(`/notes/matieres-niveau/${niveauId}`)
      .then(({ data }) => {
        setMatieres(data || []);
        if (data && data.length > 0) {
          setMatiereId(data[0].id);
        } else {
          setErreur(
            'Aucune matière dans le programme de ce niveau. Configurez les coefficients dans Programme.'
          );
        }
      })
      .catch((err) => {
        setMatieres([]);
        setErreur(
          err.response?.data?.error ||
            'Impossible de charger les matières du programme pour ce niveau.'
        );
      })
      .finally(() => setChargementMatieres(false));
  }, [classeId, classes]);

  async function chargerGrille() {
    if (!classeId || !matiereId || !periode) return;
    setErreur('');
    setMessageSucces('');
    try {
      const { data } = await api.get('/notes/saisie', {
        params: { classeId, matiereId, periode },
      });
      setGrille(data);
      const init = {};
      (data.eleves || []).forEach((e) => {
        init[e.eleveId] = e.note != null ? e.note : '';
      });
      setValeurs(init);
    } catch (err) {
      setGrille(null);
      setErreur(err.response?.data?.error || 'Erreur de chargement de la grille');
    }
  }

  useEffect(() => {
    if (classeId && matiereId && periode) {
      chargerGrille();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeId, matiereId, periode]);

  function majNote(eleveId, valeur) {
    setValeurs((prev) => ({ ...prev, [eleveId]: valeur }));
  }

  async function enregistrer(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    setMessageSucces('');
    try {
      const notes = Object.entries(valeurs)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([eleveId, valeur]) => ({
          eleveId,
          valeur: Number(valeur),
        }));

      await api.post('/notes/saisie', {
        classeId,
        matiereId,
        periode: Number(periode),
        notes,
      });

      setMessageSucces('Notes enregistrées.');
      await chargerGrille();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de l’enregistrement');
    } finally {
      setEnregistrement(false);
    }
  }

  async function chargerReclamations() {
    try {
      const { data } = await api.get('/notes/reclamations');
      setReclamations(data || []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    chargerReclamations();
  }, []);

  async function soumettreReclamation(e) {
    e.preventDefault();
    if (!reclamationOuverte) return;
    try {
      await api.post('/notes/reclamations', {
        eleveId: reclamationOuverte.eleveId,
        matiereId,
        periode: Number(periode),
        motif: motifReclamation,
      });
      setReclamationOuverte(null);
      setMotifReclamation('');
      setMessageSucces('Réclamation envoyée.');
      await chargerReclamations();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur réclamation');
    }
  }

  async function traiterReclamation(r, statut) {
    try {
      await api.patch(`/notes/reclamations/${r.id}`, { statut });
      await chargerReclamations();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur traitement');
    }
  }

  const elevesGrille = grille?.eleves || [];

  const reclamationsFiltrees =
    filtreReclamations === 'TOUTES'
      ? reclamations
      : reclamations.filter((r) => r.statut === filtreReclamations);

  if (chargement) {
    return <div className="p-8 text-slate-500">Chargement…</div>;
  }

  return (
    <div className="p-4 sm:p-8 min-h-full">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-600 mb-1">
          Pédagogie
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Notes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Les matières proposées sont celles du <strong>programme du niveau</strong>, pas
          toutes les matières de l’établissement.
        </p>
      </div>

      {erreur && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          {erreur}
        </p>
      )}
      {messageSucces && (
        <p className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          {messageSucces}
        </p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Classe</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50/50"
            value={classeId}
            onChange={(e) => setClasseId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
                {c.niveau?.libelle ? ` (${c.niveau.libelle})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Matière (programme)
          </label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50/50"
            value={matiereId}
            onChange={(e) => setMatiereId(e.target.value)}
            disabled={chargementMatieres || matieres.length === 0}
          >
            {matieres.length === 0 && (
              <option value="">— Aucune matière au programme —</option>
            )}
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
                {m.coefficient != null ? ` (coef. ${m.coefficient})` : ''}
              </option>
            ))}
          </select>
          {chargementMatieres && (
            <p className="text-[11px] text-slate-400 mt-1">Chargement…</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Période</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50/50"
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

      {matiereId && elevesGrille.length > 0 && (
        <form
          onSubmit={enregistrer}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 text-sm">
              Saisie — {matieres.find((m) => m.id === matiereId)?.nom} ·{' '}
              {NOMS_PERIODES[periode]}
              {grille?.coefficient != null ? ` · coef. ${grille.coefficient}` : ''}
            </h2>
            <button
              type="submit"
              disabled={enregistrement}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
            >
              {enregistrement ? 'Enregistrement…' : 'Enregistrer les notes'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2">Matricule</th>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Prénom</th>
                  <th className="px-4 py-2 w-28">Note / 20</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {elevesGrille.map((e) => (
                  <tr key={e.eleveId} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2 font-mono text-xs">{e.matricule}</td>
                    <td className="px-4 py-2 font-medium">{e.nom}</td>
                    <td className="px-4 py-2">{e.prenom}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                        value={valeurs[e.eleveId] ?? ''}
                        onChange={(ev) => majNote(e.eleveId, ev.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        className="text-xs text-violet-700 hover:underline"
                        onClick={() =>
                          setReclamationOuverte({
                            eleveId: e.eleveId,
                            nom: e.nom,
                            prenom: e.prenom,
                          })
                        }
                      >
                        Réclamer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}

      {matiereId && !chargementMatieres && elevesGrille.length === 0 && !erreur && (
        <p className="text-sm text-slate-500 mb-8">
          Aucun élève inscrit dans cette classe, ou grille indisponible.
        </p>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold text-slate-800 text-sm">Réclamations de notes</h2>
          <select
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
            value={filtreReclamations}
            onChange={(e) => setFiltreReclamations(e.target.value)}
          >
            <option value="TOUTES">Toutes</option>
            <option value="OUVERTE">Ouvertes</option>
            <option value="TRAITEE">Traitées</option>
            <option value="REJETEE">Rejetées</option>
          </select>
        </div>
        {reclamationsFiltrees.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune réclamation.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2">Élève</th>
                  <th className="px-3 py-2">Matière</th>
                  <th className="px-3 py-2">Période</th>
                  <th className="px-3 py-2">Statut</th>
                  {peutTraiter && <th className="px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {reclamationsFiltrees.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      {r.eleve?.nom} {r.eleve?.prenom}
                    </td>
                    <td className="px-3 py-2">{r.matiere?.nom}</td>
                    <td className="px-3 py-2">{NOMS_PERIODES[r.periode] || r.periode}</td>
                    <td className="px-3 py-2 text-xs">{r.statut}</td>
                    {peutTraiter && r.statut === 'OUVERTE' && (
                      <td className="px-3 py-2 space-x-2">
                        <button
                          type="button"
                          onClick={() => traiterReclamation(r, 'TRAITEE')}
                          className="text-green-700 text-xs hover:underline"
                        >
                          Traiter
                        </button>
                        <button
                          type="button"
                          onClick={() => traiterReclamation(r, 'REJETEE')}
                          className="text-red-700 text-xs hover:underline"
                        >
                          Rejeter
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {reclamationOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={soumettreReclamation}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
          >
            <h2 className="text-lg font-medium mb-2">Réclamer une note</h2>
            <p className="text-sm text-slate-600 mb-3">
              {reclamationOuverte.nom} {reclamationOuverte.prenom} —{' '}
              {matieres.find((m) => m.id === matiereId)?.nom}, {NOMS_PERIODES[periode]}
            </p>
            <textarea
              className="w-full border rounded-xl px-3 py-2 min-h-24 text-sm"
              placeholder="Expliquez la réclamation…"
              value={motifReclamation}
              onChange={(e) => setMotifReclamation(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setReclamationOuverte(null)}
                className="px-3 py-2 border rounded-xl text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-slate-800 text-white rounded-xl text-sm"
              >
                Envoyer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}