import { useEffect, useState } from 'react';
import api from '../api/client';

const LIBELLES_TYPE_FRAIS = {
  DROIT: "Droit d'inscription",
  ECOLAGE: 'Écolage',
  FRAIS_EXAMEN: "Frais d'examen",
  AUTRE: 'Autre',
};

export default function Paiements() {
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [eleveId, setEleveId] = useState('');
  const [solde, setSolde] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [typeFrais, setTypeFrais] = useState('ECOLAGE');
  const [montant, setMontant] = useState('');
  const [moyenPaiement, setMoyenPaiement] = useState('Espèces');
  const [enregistrement, setEnregistrement] = useState(false);
  const [situations, setSituations] = useState([]);
  const [filtre, setFiltre] = useState('TOUS');
  const [recherche, setRecherche] = useState('');
  const [chargementSituations, setChargementSituations] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/eleves'), api.get('/classes')])
      .then(([resEleves, resClasses]) => {
        setEleves(resEleves.data);
        setClasses(resClasses.data);
        if (resEleves.data.length > 0) setEleveId(resEleves.data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  const anneeScolaireId = classes[0]?.anneeScolaireId;

  async function chargerSituations() {
    if (!anneeScolaireId) return;
    setChargementSituations(true);
    try {
      const { data } = await api.get('/paiements/situations', { params: { anneeScolaireId } });
      setSituations(data.situations);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement des situations financières');
    } finally {
      setChargementSituations(false);
    }
  }

  async function chargerSoldeEtHistorique() {
    if (!eleveId || !anneeScolaireId) return;
    setErreur('');
    try {
      const [resSolde, resHistorique] = await Promise.all([
        api.get(`/paiements/eleve/${eleveId}/solde`, { params: { anneeScolaireId } }),
        api.get('/paiements', { params: { eleveId, anneeScolaireId } }),
      ]);
      setSolde(resSolde.data);
      setHistorique(resHistorique.data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement du solde');
      setSolde(null);
    }
  }

  useEffect(() => {
    chargerSoldeEtHistorique();
    chargerSituations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleveId, anneeScolaireId]);

  async function enregistrerPaiement(e) {
    e.preventDefault();
    if (!montant || Number(montant) <= 0) {
      setErreur('Le montant doit être un nombre positif');
      return;
    }
    setEnregistrement(true);
    setErreur('');
    try {
      await api.post('/paiements', {
        eleveId,
        anneeScolaireId,
        typeFrais,
        montant: Number(montant),
        moyenPaiement,
      });
      setMontant('');
      await chargerSoldeEtHistorique();
      await chargerSituations();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  const situationsFiltrees = situations.filter((situation) => {
    const correspondRecherche = `${situation.nom} ${situation.prenom} ${situation.matricule} ${situation.classe}`
      .toLowerCase()
      .includes(recherche.toLowerCase().trim());
    const correspondFiltre =
      filtre === 'TOUS' ||
      (filtre === 'DROIT_IMPAYE' && situation.droitImpayé) ||
      (filtre === 'ECOLAGE_ALERTE' && situation.ecolageAlerte);
    return correspondRecherche && correspondFiltre;
  });

  async function telechargerRecu(paiementId, numeroRecu) {
    try {
      const reponse = await api.get(`/paiements/${paiementId}/recu`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([reponse.data], { type: 'application/pdf' }));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `recu_${numeroRecu}.pdf`;
      lien.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErreur('Erreur lors du téléchargement du reçu');
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
          Finances
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Paiements</h1>
        <p className="text-sm text-slate-500 mt-1">
          Suivi des frais, enregistrement des versements et reçus PDF
        </p>
      </div>

      {erreur && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
          {erreur}
        </p>
      )}

      {/* Sélecteur élève */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 max-w-md">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Élève
        </label>
        <select
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          value={eleveId}
          onChange={(e) => setEleveId(e.target.value)}
        >
          {eleves.map((el) => (
            <option key={el.id} value={el.id}>
              {el.nom} {el.prenom} ({el.matricule})
            </option>
          ))}
        </select>
      </div>

      {/* Solde élève — cartes colorées */}
      {solde && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 border-t-4 border-t-blue-500">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
              Montant attendu ({solde.niveau})
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
              {solde.attendu?.toLocaleString('fr-FR')}{' '}
              <span className="text-sm font-normal text-slate-400">Ar</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 border-t-4 border-t-red-500">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
              Droit restant
            </p>
            <p
              className={`text-lg font-bold mt-1 tabular-nums ${
                solde.droitReste > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {solde.droitReste?.toLocaleString('fr-FR')}{' '}
              <span className="text-sm font-normal text-slate-400">Ar</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 border-t-4 border-t-emerald-500">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
              Déjà payé
            </p>
            <p className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
              {solde.paye?.toLocaleString('fr-FR')}{' '}
              <span className="text-sm font-normal text-slate-400">Ar</span>
            </p>
          </div>
          <div
            className={`bg-white rounded-2xl border shadow-sm p-4 border-t-4 ${
              solde.soldeAJour
                ? 'border-emerald-100 border-t-emerald-500'
                : 'border-orange-100 border-t-orange-500'
            }`}
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-wide ${
                solde.soldeAJour ? 'text-emerald-600' : 'text-orange-600'
              }`}
            >
              Reste à payer
            </p>
            <p
              className={`text-lg font-bold mt-1 tabular-nums ${
                solde.soldeAJour ? 'text-emerald-700' : 'text-orange-700'
              }`}
            >
              {solde.reste?.toLocaleString('fr-FR')}{' '}
              <span className="text-sm font-normal text-slate-400">Ar</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Formulaire versement */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-1">
          <h2 className="font-semibold text-slate-800 text-sm mb-4">Enregistrer un versement</h2>
          <form onSubmit={enregistrerPaiement} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Nature
              </label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={typeFrais}
                onChange={(e) => setTypeFrais(e.target.value)}
              >
                {Object.entries(LIBELLES_TYPE_FRAIS).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Montant (Ar)
              </label>
              <input
                type="number"
                min="1"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Moyen de paiement
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={moyenPaiement}
                onChange={(e) => setMoyenPaiement(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={enregistrement}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
            >
              {enregistrement ? 'Enregistrement…' : 'Enregistrer le paiement'}
            </button>
          </form>
        </div>

        {/* Historique */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80">
            <h2 className="font-semibold text-slate-800 text-sm">Historique des paiements</h2>
          </div>
          {historique.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">
              Aucun paiement enregistré pour cet élève.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-semibold">N° Reçu</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Nature</th>
                    <th className="px-4 py-3 font-semibold">Montant</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historique.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.numeroRecu}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(p.datePaiement).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {LIBELLES_TYPE_FRAIS[p.typeFrais] || p.typeFrais}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">
                        {p.montant.toLocaleString('fr-FR')} Ar
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => telechargerRecu(p.id, p.numeroRecu)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                        >
                          Reçu PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Suivi global */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Suivi des frais scolaires</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Droit obligatoire avant rentrée · Écolage signalé à partir du 15 s’il est incomplet
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
            >
              <option value="TOUS">Tous les élèves</option>
              <option value="DROIT_IMPAYE">Droit non payé</option>
              <option value="ECOLAGE_ALERTE">Écolage incomplet après le 15</option>
            </select>
            <input
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[160px]"
              placeholder="Rechercher…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
        </div>

        {chargementSituations ? (
          <p className="p-8 text-center text-slate-400 text-sm">Chargement des situations…</p>
        ) : situationsFiltrees.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">
            Aucune situation correspondant au filtre.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">Élève</th>
                  <th className="px-4 py-3 font-semibold">Classe</th>
                  <th className="px-4 py-3 font-semibold">Droit restant</th>
                  <th className="px-4 py-3 font-semibold">Écolage restant</th>
                  <th className="px-4 py-3 font-semibold">Situation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {situationsFiltrees.map((situation) => (
                  <tr key={situation.eleveId} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {situation.nom} {situation.prenom}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{situation.matricule}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{situation.classe}</td>
                    <td className="px-4 py-3 tabular-nums font-medium text-slate-800">
                      {situation.droitReste?.toLocaleString('fr-FR') ?? '—'} Ar
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-slate-800">
                      {situation.ecolageReste?.toLocaleString('fr-FR') ?? '—'} Ar
                    </td>
                    <td className="px-4 py-3">
                      {situation.droitImpayé && (
                        <span className="inline-flex rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                          Droit impayé
                        </span>
                      )}
                      {!situation.droitImpayé && situation.ecolageAlerte && (
                        <span className="inline-flex rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">
                          Écolage à relancer
                        </span>
                      )}
                      {!situation.droitImpayé && !situation.ecolageAlerte && (
                        <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          À jour
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}