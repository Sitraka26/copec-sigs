import { useEffect, useState } from 'react';
import api from '../api/client';

const STATUTS = ['PRESENT', 'ABSENT', 'RETARD'];
const LIBELLES_STATUT = { PRESENT: 'Présent', ABSENT: 'Absent', RETARD: 'Retard' };
const COULEURS_STATUT = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  RETARD: 'bg-orange-100 text-orange-800',
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

export default function Presences() {
  const [classes, setClasses] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [date, setDate] = useState(dateAujourdhui());

  const [grille, setGrille] = useState(null);
  const [statuts, setStatuts] = useState({});
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [notifications, setNotifications] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('TOUS');
  const [alertesAbsence, setAlertesAbsence] = useState([]);
  const [statutsEnregistres, setStatutsEnregistres] = useState({});

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

  useEffect(() => {
    if (!classeId || !date) return;
    setErreur('');
    setNotifications(null);
    api
      .get('/presences/saisie', { params: { classeId, date } })
      .then(({ data }) => {
        setGrille(data);
        const initiaux = {};
        data.eleves.forEach((e) => {
          initiaux[e.eleveId] = e.statut;
        });
        const brouillon = sessionStorage.getItem(`presences:${classeId}:${date}`);
        const statutsBrouillon = brouillon ? JSON.parse(brouillon) : initiaux;
        setStatutsEnregistres(initiaux);
        setStatuts(statutsBrouillon);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement de la grille'));
  }, [classeId, date]);

  function majStatut(eleveId, statut) {
    setStatuts((s) => {
      const suivants = { ...s, [eleveId]: statut };
      sessionStorage.setItem(`presences:${classeId}:${date}`, JSON.stringify(suivants));
      return suivants;
    });
  }

  async function enregistrer() {
    setEnregistrement(true);
    setErreur('');
    setNotifications(null);
    try {
      const presences = Object.entries(statuts).map(([eleveId, statut]) => ({ eleveId, statut }));
      const { data } = await api.post('/presences/saisie', { classeId, date, presences });

      const smsEnvoyes = data.resultats.filter((r) => r.notification?.envoye).length;
      const smsEchoues = data.resultats.filter((r) => r.notification && !r.notification.envoye);
      const alertes = data.resultats.filter((r) => r.alerteAbsence);
      sessionStorage.removeItem(`presences:${classeId}:${date}`);
      setStatutsEnregistres({ ...statuts });
      setAlertesAbsence(alertes);
      setNotifications({ smsEnvoyes, smsEchoues });
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-6">Présences</h1>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm mb-1">Classe</label>
          <select className="border rounded px-3 py-2" value={classeId} onChange={(e) => setClasseId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}
      {JSON.stringify(statuts) !== JSON.stringify(statutsEnregistres) && (
        <p className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Modifications non enregistrées. Clique sur « Enregistrer les présences » avant de quitter cette page.
        </p>
      )}

      {notifications && (
        <div className="mb-4 text-sm">
          {notifications.smsEnvoyes > 0 && (
            <p className="text-green-700">✓ {notifications.smsEnvoyes} SMS envoyé(s) aux parents.</p>
          )}

          {alertesAbsence.length > 0 && (
            <div className="mb-4 rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
              <p className="font-medium">Alerte envoyée à la direction</p>
              <p>{alertesAbsence.length} élève(s) ont atteint au moins 3 absences consécutives. Un message interne a été créé dans Messages.</p>
            </div>
          )}
          {notifications.smsEchoues.length > 0 && (
            <div className="text-orange-700 mt-1">
              <p>⚠ {notifications.smsEchoues.length} SMS non envoyé(s) :</p>
              <ul className="list-disc list-inside">
                {notifications.smsEchoues.map((r, i) => (
                  <li key={i}>{r.notification.raison}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {grille && grille.eleves.length === 0 && (
        <p className="text-gray-500">Aucun élève inscrit dans cette classe.</p>
      )}

      {grille && grille.eleves.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              className="border rounded px-3 py-2 text-sm"
              placeholder="Rechercher un élève..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <select className="border rounded px-3 py-2 text-sm" value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
              <option value="TOUS">Tous les statuts</option>
              {STATUTS.map((s) => <option key={s} value={s}>{LIBELLES_STATUT[s]}</option>)}
            </select>
          </div>
          <div className="bg-white rounded border overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-4 py-2">Matricule</th>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Prénom</th>
                  <th className="px-4 py-2 w-64">Statut</th>
                </tr>
              </thead>
              <tbody>
                {grille.eleves
                  .filter((eleve) => `${eleve.nom} ${eleve.prenom}`.toLowerCase().includes(recherche.toLowerCase().trim()))
                  .filter((eleve) => filtreStatut === 'TOUS' || statuts[eleve.eleveId] === filtreStatut)
                  .map((eleve) => (
                  <tr key={eleve.eleveId} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{eleve.matricule}</td>
                    <td className="px-4 py-2">{eleve.nom}</td>
                    <td className="px-4 py-2">{eleve.prenom}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {STATUTS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => majStatut(eleve.eleveId, s)}
                            className={`px-3 py-1 rounded text-xs font-medium border ${
                              statuts[eleve.eleveId] === s
                                ? COULEURS_STATUT[s] + ' border-transparent'
                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {LIBELLES_STATUT[s]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={enregistrer}
            disabled={enregistrement}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {enregistrement ? 'Enregistrement...' : "Enregistrer les présences"}
          </button>
        </>
      )}
    </div>
  );
}