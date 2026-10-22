import { useEffect, useState } from 'react';
import api from '../api/client';

const STATUTS = ['PRESENT', 'ABSENT', 'RETARD'];
const LIBELLES_STATUT = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  RETARD: 'Retard',
};
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
  // { [eleveId]: { statut, minutesRetard } }
  const [lignes, setLignes] = useState({});
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [notifications, setNotifications] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('TOUS');
  const [alertesAbsence, setAlertesAbsence] = useState([]);
  const [lignesEnregistrees, setLignesEnregistrees] = useState({});

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
          initiaux[e.eleveId] = {
            statut: e.statut || 'PRESENT',
            minutesRetard: e.minutesRetard ?? '',
          };
        });
        const brouillon = sessionStorage.getItem(`presences:${classeId}:${date}`);
        const depuisBrouillon = brouillon ? JSON.parse(brouillon) : initiaux;
        setLignesEnregistrees(initiaux);
        setLignes(depuisBrouillon);
      })
      .catch((err) =>
        setErreur(err.response?.data?.error || 'Erreur de chargement de la grille')
      );
  }, [classeId, date]);

  function majStatut(eleveId, statut) {
    setLignes((s) => {
      const suivants = {
        ...s,
        [eleveId]: {
          statut,
          minutesRetard:
            statut === 'RETARD' ? s[eleveId]?.minutesRetard || '' : '',
        },
      };
      sessionStorage.setItem(
        `presences:${classeId}:${date}`,
        JSON.stringify(suivants)
      );
      return suivants;
    });
  }

  function majMinutes(eleveId, valeur) {
    setLignes((s) => {
      const suivants = {
        ...s,
        [eleveId]: {
          ...s[eleveId],
          statut: 'RETARD',
          minutesRetard: valeur,
        },
      };
      sessionStorage.setItem(
        `presences:${classeId}:${date}`,
        JSON.stringify(suivants)
      );
      return suivants;
    });
  }

  async function enregistrer() {
    setEnregistrement(true);
    setErreur('');
    setNotifications(null);
    try {
      for (const [eleveId, ligne] of Object.entries(lignes)) {
        if (ligne.statut === 'RETARD') {
          const m = Number(ligne.minutesRetard);
          if (!Number.isFinite(m) || m < 1) {
            setErreur(
              'Pour chaque retard, indiquez le nombre de minutes (au moins 1).'
            );
            setEnregistrement(false);
            return;
          }
        }
      }

      const presences = Object.entries(lignes).map(([eleveId, ligne]) => ({
        eleveId,
        statut: ligne.statut,
        minutesRetard:
          ligne.statut === 'RETARD' ? Number(ligne.minutesRetard) : null,
      }));

      const { data } = await api.post('/presences/saisie', {
        classeId,
        date,
        presences,
      });

      const smsEnvoyes = data.resultats.filter((r) => r.notification?.envoye)
        .length;
      const smsEchoues = data.resultats.filter(
        (r) => r.notification && !r.notification.envoye
      );
      const alertes = data.resultats.filter((r) => r.alerteAbsence);
      sessionStorage.removeItem(`presences:${classeId}:${date}`);
      setLignesEnregistrees({ ...lignes });
      setAlertesAbsence(alertes);
      setNotifications({ smsEnvoyes, smsEchoues });
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) {
    return <div className="p-8 text-gray-500">Chargement...</div>;
  }

  const modifie =
    JSON.stringify(lignes) !== JSON.stringify(lignesEnregistrees);

  return (
    <div className="p-4 sm:p-8 min-h-full">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Présences</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm mb-1">Classe</label>
          <select
            className="border rounded-xl px-3 py-2 text-sm"
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
          <label className="block text-sm mb-1">Date</label>
          <input
            type="date"
            className="border rounded-xl px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {erreur && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
          {erreur}
        </p>
      )}

      {modifie && (
        <p className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Modifications non enregistrées. Clique sur « Enregistrer les présences »
          avant de quitter.
        </p>
      )}

      {notifications && (
        <div className="mb-4 text-sm space-y-2">
          {notifications.smsEnvoyes > 0 && (
            <p className="text-green-700">
              ✓ {notifications.smsEnvoyes} SMS envoyé(s) aux parents.
            </p>
          )}
          {alertesAbsence.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-orange-900">
              <p className="font-medium">Alerte envoyée à la direction</p>
              <p>
                {alertesAbsence.length} élève(s) ont au moins 3 absences
                consécutives.
              </p>
            </div>
          )}
          {notifications.smsEchoues.length > 0 && (
            <div className="text-orange-700">
              <p>⚠ {notifications.smsEchoues.length} SMS non envoyé(s)</p>
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
              className="border rounded-xl px-3 py-2 text-sm"
              placeholder="Rechercher un élève..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <select
              className="border rounded-xl px-3 py-2 text-sm"
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
            >
              <option value="TOUS">Tous les statuts</option>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {LIBELLES_STATUT[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Matricule</th>
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Prénom</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Minutes de retard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {grille.eleves
                  .filter((eleve) =>
                    `${eleve.nom} ${eleve.prenom}`
                      .toLowerCase()
                      .includes(recherche.toLowerCase().trim())
                  )
                  .filter(
                    (eleve) =>
                      filtreStatut === 'TOUS' ||
                      lignes[eleve.eleveId]?.statut === filtreStatut
                  )
                  .map((eleve) => {
                    const ligne = lignes[eleve.eleveId] || {
                      statut: 'PRESENT',
                      minutesRetard: '',
                    };
                    return (
                      <tr key={eleve.eleveId} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs">
                          {eleve.matricule}
                        </td>
                        <td className="px-4 py-2 font-medium">{eleve.nom}</td>
                        <td className="px-4 py-2">{eleve.prenom}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {STATUTS.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => majStatut(eleve.eleveId, s)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                  ligne.statut === s
                                    ? COULEURS_STATUT[s] + ' border-transparent'
                                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {LIBELLES_STATUT[s]}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {ligne.statut === 'RETARD' ? (
                            <input
                              type="number"
                              min={1}
                              max={240}
                              className="w-24 border border-orange-200 rounded-lg px-2 py-1.5 text-sm bg-orange-50"
                              placeholder="ex. 15"
                              value={ligne.minutesRetard}
                              onChange={(e) =>
                                majMinutes(eleve.eleveId, e.target.value)
                              }
                            />
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <button
            onClick={enregistrer}
            disabled={enregistrement}
            className="bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
          >
            {enregistrement ? 'Enregistrement...' : 'Enregistrer les présences'}
          </button>
        </>
      )}
    </div>
  );
}