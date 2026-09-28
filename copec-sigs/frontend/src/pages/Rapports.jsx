import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Rapports() {
  const [annees, setAnnees] = useState([]);
  const [anneeId, setAnneeId] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [telechargementEnCours, setTelechargementEnCours] = useState(null);
  const [synthese, setSynthese] = useState(null);
  const [periode, setPeriode] = useState('1');
  const [chargementSynthese, setChargementSynthese] = useState(false);

  useEffect(() => {
    api
      .get('/annees-scolaires')
      .then(({ data }) => {
        setAnnees(data);
        const active = data.find((a) => a.active) || data[0];
        if (active) setAnneeId(active.id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!anneeId) return;
    setChargementSynthese(true);
    api
      .get(`/rapports/synthese?anneeScolaireId=${anneeId}`)
      .then(({ data }) => setSynthese(data))
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement de la synthèse'))
      .finally(() => setChargementSynthese(false));
  }, [anneeId]);

  async function telecharger(cle, url, nomFichier) {
    setTelechargementEnCours(cle);
    setErreur('');
    try {
      const reponse = await api.get(url, { responseType: 'blob' });
      const lienUrl = window.URL.createObjectURL(
        new Blob([reponse.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const lien = document.createElement('a');
      lien.href = lienUrl;
      lien.download = nomFichier;
      lien.click();
      window.URL.revokeObjectURL(lienUrl);
    } catch (err) {
      setErreur('Erreur lors du téléchargement du rapport');
    } finally {
      setTelechargementEnCours(null);
    }
  }

  function formaterMontant(montant) {
    return `${new Intl.NumberFormat('fr-FR').format(montant || 0)} Ar`;
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
          Analyse
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rapports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Synthèse de l’établissement et exports Excel prêts à archiver
        </p>
      </div>

      {erreur && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
          {erreur}
        </p>
      )}

      {/* Synthèse */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Synthèse de l’année</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Indicateurs selon l’année scolaire sélectionnée
            </p>
          </div>
          <select
            className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={anneeId}
            onChange={(e) => setAnneeId(e.target.value)}
          >
            {annees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle}
              </option>
            ))}
          </select>
        </div>

        {chargementSynthese ? (
          <p className="text-sm text-slate-400">Calcul de la synthèse…</p>
        ) : (
          synthese && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 border-t-4 border-t-blue-500">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                    Élèves inscrits
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{synthese.eleves}</p>
                </div>
                <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 border-t-4 border-t-violet-500">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
                    Classes actives
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{synthese.classes}</p>
                </div>
                <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 border-t-4 border-t-orange-500">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
                    Absences
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {synthese.scolarite?.absences ?? 0}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 border-t-4 border-t-emerald-500">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                    Moyenne des notes
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                    {synthese.scolarite?.moyenne ?? '—'}
                    <span className="text-sm font-normal text-slate-400">/20</span>
                  </p>
                </div>
              </div>

              {synthese.paiements && (
                <div className="flex flex-wrap gap-4 mt-5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600">
                  <span>
                    Recettes :{' '}
                    <strong className="text-slate-900">
                      {formaterMontant(synthese.paiements.total)}
                    </strong>
                  </span>
                  <span>
                    Droits :{' '}
                    <strong className="text-slate-900">
                      {formaterMontant(synthese.paiements.droit)}
                    </strong>
                  </span>
                  <span>
                    Écolage :{' '}
                    <strong className="text-slate-900">
                      {formaterMontant(synthese.paiements.ecolage)}
                    </strong>
                  </span>
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Exports */}
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Exports Excel</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 border-l-4 border-l-blue-500">
          <h3 className="font-semibold text-blue-700 text-sm mb-1">Liste des élèves</h3>
          <p className="text-xs text-slate-500 mb-4">
            Tous les élèves inscrits, avec leur classe actuelle.
          </p>
          <button
            onClick={() => telecharger('eleves', '/rapports/eleves', 'eleves.xlsx')}
            disabled={telechargementEnCours === 'eleves'}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
          >
            {telechargementEnCours === 'eleves' ? 'Génération…' : 'Télécharger Excel'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 border-l-4 border-l-orange-500">
          <h3 className="font-semibold text-orange-700 text-sm mb-1">Absences et retards</h3>
          <p className="text-xs text-slate-500 mb-4">
            Élève, classe, date, statut, justification et contact d’urgence.
          </p>
          <button
            onClick={() =>
              telecharger(
                'absences',
                `/rapports/absences?anneeScolaireId=${anneeId}`,
                'absences.xlsx'
              )
            }
            disabled={telechargementEnCours === 'absences' || !anneeId}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 shadow-lg shadow-orange-600/20 transition"
          >
            {telechargementEnCours === 'absences' ? 'Génération…' : 'Télécharger Excel'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 border-l-4 border-l-emerald-500">
          <h3 className="font-semibold text-emerald-700 text-sm mb-1">Résultats scolaires</h3>
          <p className="text-xs text-slate-500 mb-3">
            Moyenne et nombre de notes par élève pour un bimestre.
          </p>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm mb-3 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
          >
            {[1, 2, 3, 4, 5].map((numero) => (
              <option key={numero} value={numero}>
                Bimestre {numero}
              </option>
            ))}
          </select>
          <div>
            <button
              onClick={() =>
                telecharger(
                  'resultats',
                  `/rapports/resultats?anneeScolaireId=${anneeId}&periode=${periode}`,
                  `resultats-bimestre-${periode}.xlsx`
                )
              }
              disabled={telechargementEnCours === 'resultats' || !anneeId}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-600/20 transition"
            >
              {telechargementEnCours === 'resultats' ? 'Génération…' : 'Télécharger Excel'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5 border-l-4 border-l-violet-500">
          <h3 className="font-semibold text-violet-700 text-sm mb-1">Historique des paiements</h3>
          <p className="text-xs text-slate-500 mb-3">Pour l’année scolaire sélectionnée.</p>
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-3 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            value={anneeId}
            onChange={(e) => setAnneeId(e.target.value)}
          >
            {annees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              telecharger(
                'paiements',
                `/rapports/paiements?anneeScolaireId=${anneeId}`,
                'paiements.xlsx'
              )
            }
            disabled={telechargementEnCours === 'paiements'}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 disabled:opacity-50 shadow-lg shadow-violet-600/20 transition"
          >
            {telechargementEnCours === 'paiements' ? 'Génération…' : 'Télécharger Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}