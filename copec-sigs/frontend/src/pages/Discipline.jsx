import { useEffect, useState } from 'react';
import api from '../api/client';

const TYPES = [
  { value: 'OBSERVATION_POSITIVE', label: 'Observation positive', points: 1 },
  { value: 'OBSERVATION_NEGATIVE', label: 'Observation négative', points: -1 },
  { value: 'AVERTISSEMENT', label: 'Avertissement', points: -2 },
  { value: 'BLAME', label: 'Blâme', points: -5 },
  { value: 'EXCLUSION_TEMPORAIRE', label: 'Exclusion temporaire', points: -10 },
  { value: 'AUTRE', label: 'Autre', points: 0 },
];

const COULEURS = {
  OBSERVATION_POSITIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  OBSERVATION_NEGATIVE: 'bg-orange-50 text-orange-800 border-orange-200',
  AVERTISSEMENT: 'bg-amber-50 text-amber-800 border-amber-200',
  BLAME: 'bg-red-50 text-red-800 border-red-200',
  EXCLUSION_TEMPORAIRE: 'bg-red-100 text-red-900 border-red-300',
  AUTRE: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function Discipline() {
  const [eleves, setEleves] = useState([]);
  const [liste, setListe] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const [eleveId, setEleveId] = useState('');
  const [type, setType] = useState('OBSERVATION_NEGATIVE');
  const [motif, setMotif] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);

  function charger() {
    setChargement(true);
    Promise.all([api.get('/eleves'), api.get('/disciplines')])
      .then(([resEleves, resDisc]) => {
        setEleves(resEleves.data);
        setListe(resDisc.data);
        if (resEleves.data.length && !eleveId) setEleveId(resEleves.data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }

  useEffect(() => {
    charger();
  }, []);

  async function soumettre(e) {
    e.preventDefault();
    if (!eleveId || !motif.trim()) {
      setErreur('Élève et motif obligatoires');
      return;
    }
    setErreur('');
    setSucces('');
    setEnvoi(true);
    const typeInfo = TYPES.find((t) => t.value === type);
    try {
      await api.post('/disciplines', {
        eleveId,
        type,
        motif: motif.trim(),
        description: description.trim() || null,
        points: typeInfo?.points ?? 0,
      });
      setMotif('');
      setDescription('');
      setSucces('Entrée enregistrée');
      charger();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Discipline</h1>
        <p className="text-slate-500 text-sm mt-1">
          Carnet de comportement — observations, avertissements, blâmes
        </p>
      </div>

      {erreur && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-4">{erreur}</p>
      )}
      {succes && (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mb-4">{succes}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire */}
        <form onSubmit={soumettre} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4 lg:col-span-1">
          <h2 className="font-medium text-slate-800">Nouvelle entrée</h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Élève</label>
            <select
              value={eleveId}
              onChange={(e) => setEleveId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {eleves.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prenom} {e.nom} ({e.matricule})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Motif *</label>
            <input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Ex. Retard répété, travail exemplaire…"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={envoi}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg"
          >
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        {/* Historique */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="font-medium text-slate-800 text-sm">Historique récent</h2>
          </div>

          {chargement ? (
            <p className="p-6 text-slate-400 text-sm">Chargement…</p>
          ) : liste.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">Aucune entrée pour le moment.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
              {liste.map((d) => (
                <li key={d.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-slate-800">
                        {d.eleve?.prenom} {d.eleve?.nom}
                        <span className="text-slate-400 font-normal ml-1">({d.eleve?.matricule})</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">{d.motif}</p>
                      {d.description && (
                        <p className="text-xs text-slate-400 mt-1">{d.description}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${COULEURS[d.type] || COULEURS.AUTRE}`}>
                      {TYPES.find((t) => t.value === d.type)?.label || d.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(d.dateIncident).toLocaleDateString('fr-FR')} · par {d.auteur?.prenom} {d.auteur?.nom}
                    {d.points !== 0 && (
                      <span className={d.points > 0 ? ' text-emerald-600' : ' text-red-600'}>
                        {' '}· {d.points > 0 ? '+' : ''}{d.points} pt
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}