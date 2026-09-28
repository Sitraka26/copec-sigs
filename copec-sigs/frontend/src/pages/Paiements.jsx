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

  // On récupère l'anneeScolaireId via la première classe disponible
  // (dans ce projet, une seule année scolaire est active à la fois)
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

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-6">Paiements</h1>

      <div className="mb-6">
        <label className="block text-sm mb-1">Élève</label>
        <select className="border rounded px-3 py-2 w-72" value={eleveId} onChange={(e) => setEleveId(e.target.value)}>
          {eleves.map((el) => (
            <option key={el.id} value={el.id}>{el.nom} {el.prenom} ({el.matricule})</option>
          ))}
        </select>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

      <section className="bg-white border rounded p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-medium">Suivi des frais scolaires</h2>
            <p className="text-xs text-gray-500">Le droit est obligatoire avant la rentrée. L’écolage est signalé à partir du 15 s’il reste incomplet.</p>
          </div>
          <div className="flex gap-2">
            <select className="border rounded px-2 py-1 text-sm" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
              <option value="TOUS">Tous les élèves</option>
              <option value="DROIT_IMPAYE">Droit non payé</option>
              <option value="ECOLAGE_ALERTE">Écolage incomplet après le 15</option>
            </select>
            <input className="border rounded px-3 py-1 text-sm" placeholder="Rechercher..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </div>
        </div>
        {chargementSituations ? (
          <p className="text-sm text-gray-500">Chargement des situations...</p>
        ) : situationsFiltrees.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune situation correspondant au filtre.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr><th className="px-3 py-2">Élève</th><th className="px-3 py-2">Classe</th><th className="px-3 py-2">Droit restant</th><th className="px-3 py-2">Écolage restant</th><th className="px-3 py-2">Situation</th></tr>
              </thead>
              <tbody>
                {situationsFiltrees.map((situation) => (
                  <tr key={situation.eleveId} className="border-t">
                    <td className="px-3 py-2">{situation.nom} {situation.prenom}<div className="text-xs text-gray-500">{situation.matricule}</div></td>
                    <td className="px-3 py-2">{situation.classe}</td>
                    <td className="px-3 py-2">{situation.droitReste?.toLocaleString('fr-FR') ?? '—'} Ar</td>
                    <td className="px-3 py-2">{situation.ecolageReste?.toLocaleString('fr-FR') ?? '—'} Ar</td>
                    <td className="px-3 py-2">
                      {situation.droitImpayé && <span className="mr-2 rounded bg-red-100 px-2 py-1 text-xs text-red-800">Droit impayé</span>}
                      {!situation.droitImpayé && situation.ecolageAlerte && <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">Écolage à relancer</span>}
                      {!situation.droitImpayé && !situation.ecolageAlerte && <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">À jour</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {solde && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded p-4">
            <div className="text-xs text-gray-500 mb-1">Montant attendu ({solde.niveau})</div>
            <div className="text-lg font-semibold">{solde.attendu?.toLocaleString('fr-FR')} Ar</div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs text-gray-500 mb-1">Droit restant avant rentrée</div>
            <div className={`text-lg font-semibold ${solde.droitReste > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {solde.droitReste?.toLocaleString('fr-FR')} Ar
            </div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-xs text-gray-500 mb-1">Déjà payé</div>
            <div className="text-lg font-semibold text-green-700">{solde.paye?.toLocaleString('fr-FR')} Ar</div>
          </div>
          <div className={`border rounded p-4 ${solde.soldeAJour ? 'bg-green-50' : 'bg-orange-50'}`}>
            <div className="text-xs text-gray-500 mb-1">Reste à payer</div>
            <div className={`text-lg font-semibold ${solde.soldeAJour ? 'text-green-700' : 'text-orange-700'}`}>
              {solde.reste?.toLocaleString('fr-FR')} Ar
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded p-5 mb-6 max-w-md">
        <h2 className="font-medium mb-3">Enregistrer un versement</h2>
        <form onSubmit={enregistrerPaiement} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Nature du versement</label>
            <select className="w-full border rounded px-3 py-2" value={typeFrais} onChange={(e) => setTypeFrais(e.target.value)}>
              {Object.entries(LIBELLES_TYPE_FRAIS).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>{libelle}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Montant (Ar)</label>
            <input
              type="number"
              min="1"
              className="w-full border rounded px-3 py-2"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Moyen de paiement</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={moyenPaiement}
              onChange={(e) => setMoyenPaiement(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={enregistrement}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {enregistrement ? 'Enregistrement...' : 'Enregistrer le paiement'}
          </button>
        </form>
      </div>

      <h2 className="font-medium mb-3">Historique des paiements</h2>
      {historique.length === 0 ? (
        <p className="text-gray-500">Aucun paiement enregistré pour cet élève.</p>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">N° Reçu</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Nature</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {historique.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{p.numeroRecu}</td>
                  <td className="px-4 py-2">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{LIBELLES_TYPE_FRAIS[p.typeFrais] || p.typeFrais}</td>
                  <td className="px-4 py-2">{p.montant.toLocaleString('fr-FR')} Ar</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => telechargerRecu(p.id, p.numeroRecu)}
                      className="text-blue-700 hover:underline text-xs"
                    >
                      Télécharger le reçu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}