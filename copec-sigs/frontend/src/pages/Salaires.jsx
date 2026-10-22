import { useEffect, useState } from 'react';
import api from '../api/client';

const LIBELLES_CYCLE = {
  PRESCOLAIRE: 'Préscolaire',
  PRIMAIRE: 'Primaire',
  COLLEGE: 'Collège',
  LYCEE: 'Lycée',
};

function modeDepuisCycle(cycle) {
  if (cycle === 'PRESCOLAIRE' || cycle === 'PRIMAIRE') return 'FIXE';
  if (cycle === 'COLLEGE' || cycle === 'LYCEE') return 'HORAIRE';
  return '—';
}

export default function Salaires() {
  const [params, setParams] = useState({
    salaireFixePresco: 0,
    salaireFixePrimaire: 0,
    tauxHoraireSecondaire: 0,
    maxHeuresSemaine: 6,
  });
  const [mois, setMois] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [enseignants, setEnseignants] = useState([]);
  const [calculs, setCalculs] = useState({}); // id -> résultat calcul
  const [chargement, setChargement] = useState(true);
  const [calculEnCours, setCalculEnCours] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const [detail, setDetail] = useState(null);
  const [presences, setPresences] = useState([]);
  const [formAbsence, setFormAbsence] = useState({
    date: new Date().toISOString().slice(0, 10),
    present: false,
    heuresFaites: 0,
    motifAbsence: '',
  });
  const [envoiAbsence, setEnvoiAbsence] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/salaires/parametres'), api.get('/enseignants')])
      .then(([resP, resE]) => {
        setParams({
          salaireFixePresco: resP.data.salaireFixePresco ?? 0,
          salaireFixePrimaire: resP.data.salaireFixePrimaire ?? 0,
          tauxHoraireSecondaire: resP.data.tauxHoraireSecondaire ?? 0,
          maxHeuresSemaine: resP.data.maxHeuresSemaine ?? 6,
        });
        setEnseignants(resE.data || []);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  async function sauverParams(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    setMessage('');
    try {
      const { data } = await api.put('/salaires/parametres', params);
      setParams({
        salaireFixePresco: data.salaireFixePresco,
        salaireFixePrimaire: data.salaireFixePrimaire,
        tauxHoraireSecondaire: data.tauxHoraireSecondaire,
        maxHeuresSemaine: data.maxHeuresSemaine,
      });
      setMessage('Paramètres enregistrés.');
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur enregistrement');
    } finally {
      setEnregistrement(false);
    }
  }

  async function lancerCalcul() {
    setCalculEnCours(true);
    setErreur('');
    setMessage('');
    try {
      const { data } = await api.get('/salaires/calcul-tous', { params: { mois } });
      const map = {};
      for (const r of data.resultats || []) {
        if (r.enseignant?.id) map[r.enseignant.id] = r;
      }
      setCalculs(map);
      setMessage(`Calcul terminé pour ${Object.keys(map).length} enseignant(s) — ${mois}`);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur calcul');
    } finally {
      setCalculEnCours(false);
    }
  }

  async function ouvrirDetail(ens) {
    setErreur('');
    try {
      const [resCalcul, resPres] = await Promise.all([
        api.get('/salaires/calcul', { params: { enseignantId: ens.id, mois } }),
        api.get('/salaires/presences', { params: { enseignantId: ens.id, mois } }),
      ]);
      setDetail({ ...resCalcul.data, _ens: ens });
      setPresences(resPres.data || []);
      setFormAbsence({
        date: new Date().toISOString().slice(0, 10),
        present: false,
        heuresFaites: 0,
        motifAbsence: '',
      });
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur détail');
    }
  }

  async function soumettreAbsence(e) {
    e.preventDefault();
    if (!detail?.enseignant?.id) return;
    setEnvoiAbsence(true);
    setErreur('');
    try {
      await api.post('/salaires/presences', {
        enseignantId: detail.enseignant.id,
        ...formAbsence,
      });
      setMessage('Absence / présence enregistrée.');
      await ouvrirDetail(detail._ens || { id: detail.enseignant.id });
      await lancerCalcul();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur saisie');
    } finally {
      setEnvoiAbsence(false);
    }
  }

  if (chargement) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-full max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-1">
          Personnel
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Salaires enseignants</h1>
        <ol className="mt-3 text-sm text-slate-600 space-y-1 list-decimal list-inside bg-white border border-slate-100 rounded-xl p-4">
          <li>
            La direction fixe les montants (présco / primaire en <strong>fixe</strong>,
            secondaire en <strong>Ar/heure</strong>).
          </li>
          <li>
            Choisis le mois puis clique <strong>Calculer</strong> pour voir le salaire de
            chaque enseignant.
          </li>
          <li>
            Clique sur un enseignant pour le suivi (heures, absences). Une absence au
            secondaire diminue le montant.
          </li>
        </ol>
      </div>

      {erreur && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
          {erreur}
        </p>
      )}
      {message && (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm mb-4">
          {message}
        </p>
      )}

      {/* Paramètres */}
      <form
        onSubmit={sauverParams}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6"
      >
        <h2 className="text-sm font-bold text-slate-800 mb-1">1. Paramètres (direction)</h2>
        <p className="text-xs text-slate-500 mb-4">
          Ces montants s’appliquent à tout l’établissement.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Fixe préscolaire (Ar/mois)
            </label>
            <input
              type="number"
              min="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              value={params.salaireFixePresco}
              onChange={(e) =>
                setParams((p) => ({ ...p, salaireFixePresco: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Fixe primaire (Ar/mois)
            </label>
            <input
              type="number"
              min="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              value={params.salaireFixePrimaire}
              onChange={(e) =>
                setParams((p) => ({ ...p, salaireFixePrimaire: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Taux secondaire (Ar / heure)
            </label>
            <input
              type="number"
              min="0"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              value={params.tauxHoraireSecondaire}
              onChange={(e) =>
                setParams((p) => ({ ...p, tauxHoraireSecondaire: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Max heures / semaine (secondaire)
            </label>
            <input
              type="number"
              min="1"
              max="40"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              value={params.maxHeuresSemaine}
              onChange={(e) =>
                setParams((p) => ({ ...p, maxHeuresSemaine: e.target.value }))
              }
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={enregistrement}
          className="mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-700 hover:bg-blue-600 disabled:opacity-50"
        >
          {enregistrement ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </button>
      </form>

      {/* Calcul */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-800 mb-1">2. Calcul du mois</h2>
        <p className="text-xs text-slate-500 mb-4">
          Le montant apparaît dans le tableau ci-dessous après le calcul.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mois</label>
            <input
              type="month"
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
              value={mois}
              onChange={(e) => setMois(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={lancerCalcul}
            disabled={calculEnCours || enseignants.length === 0}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            {calculEnCours ? 'Calcul en cours…' : 'Calculer le mois'}
          </button>
        </div>
      </div>

      {/* Suivi par enseignant — TOUJOURS visible */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">3. Suivi par enseignant</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {enseignants.length} enseignant(s) · Clique sur une ligne pour le détail et les
            absences
          </p>
        </div>

        {enseignants.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            Aucun enseignant. Crée-en d’abord dans le menu Enseignants (avec un cycle).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 border-b">
                  <th className="px-4 py-3 font-semibold">Enseignant</th>
                  <th className="px-4 py-3 font-semibold">Cycle</th>
                  <th className="px-4 py-3 font-semibold">Mode de paie</th>
                  <th className="px-4 py-3 font-semibold">Détail calcul</th>
                  <th className="px-4 py-3 font-semibold text-right">Salaire du mois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {enseignants.map((ens) => {
                  const c = calculs[ens.id];
                  const mode = c?.mode || modeDepuisCycle(ens.cyclePrincipal);
                  return (
                    <tr
                      key={ens.id}
                      onClick={() => ouvrirDetail(ens)}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {ens.utilisateur?.prenom} {ens.utilisateur?.nom}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {LIBELLES_CYCLE[ens.cyclePrincipal] || ens.cyclePrincipal || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            mode === 'FIXE'
                              ? 'bg-blue-50 text-blue-700'
                              : mode === 'HORAIRE'
                                ? 'bg-violet-50 text-violet-700'
                                : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          {mode === 'FIXE'
                            ? 'Fixe / mois'
                            : mode === 'HORAIRE'
                              ? 'À l’heure'
                              : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {!c
                          ? 'Pas encore calculé'
                          : c.mode === 'HORAIRE'
                            ? `${c.heuresPayees ?? 0} h payées / ${c.heuresPrevues ?? 0} h prévues`
                            : c.detail || 'Salaire fixe'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        {c?.montant != null
                          ? `${Number(c.montant).toLocaleString('fr-FR')} Ar`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Détail + absences */}
      {detail && detail.enseignant && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {detail.enseignant.prenom} {detail.enseignant.nom}
              </h2>
              <p className="text-sm text-slate-500">
                Suivi — {mois} · {detail.mode} ·{' '}
                {LIBELLES_CYCLE[detail.cycle] || detail.cycle || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Fermer
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[11px] font-semibold uppercase text-blue-600">
                Salaire ce mois
              </p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {Number(detail.montant || 0).toLocaleString('fr-FR')} Ar
              </p>
            </div>
            {detail.mode === 'HORAIRE' && (
              <>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">
                    Heures prévues
                  </p>
                  <p className="text-xl font-bold">{detail.heuresPrevues ?? 0} h</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-violet-600">
                    Heures payées
                  </p>
                  <p className="text-xl font-bold">{detail.heuresPayees ?? 0} h</p>
                </div>
              </>
            )}
          </div>

          <form onSubmit={soumettreAbsence} className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">
              Saisir une absence / présence
            </h3>
            <p className="text-xs text-slate-500">
              Au secondaire, un jour marqué absent = 0 h payée ce jour-là.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={formAbsence.date}
                  onChange={(e) =>
                    setFormAbsence((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Statut
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={formAbsence.present ? '1' : '0'}
                  onChange={(e) =>
                    setFormAbsence((f) => ({
                      ...f,
                      present: e.target.value === '1',
                      heuresFaites: e.target.value === '1' ? f.heuresFaites : 0,
                    }))
                  }
                >
                  <option value="0">Absent</option>
                  <option value="1">Présent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Heures faites
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={formAbsence.heuresFaites}
                  disabled={!formAbsence.present}
                  onChange={(e) =>
                    setFormAbsence((f) => ({ ...f, heuresFaites: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motif</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="Maladie, permission…"
                  value={formAbsence.motifAbsence}
                  onChange={(e) =>
                    setFormAbsence((f) => ({ ...f, motifAbsence: e.target.value }))
                  }
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={envoiAbsence}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50"
            >
              {envoiAbsence ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">
              Historique du mois ({presences.length})
            </h3>
            {presences.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aucune saisie. Sans saisie, le secondaire compte les heures de l’emploi du
                temps.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {presences.map((p) => (
                  <li
                    key={p.id}
                    className="px-4 py-2.5 text-sm flex justify-between gap-2"
                  >
                    <span>
                      {new Date(p.date).toLocaleDateString('fr-FR')} —{' '}
                      <strong>{p.present ? 'Présent' : 'Absent'}</strong>
                      {p.motifAbsence ? ` (${p.motifAbsence})` : ''}
                    </span>
                    <span className="text-slate-500">
                      {p.heuresFaites} h / {p.heuresPrevues} h
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}