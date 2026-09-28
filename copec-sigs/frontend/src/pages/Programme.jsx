import { useEffect, useState } from 'react';
import api from '../api/client';

const ONGLETS = [
  { id: 'coefficients', libelle: 'Coefficients par niveau', couleur: 'blue' },
  { id: 'planifications', libelle: 'Planification pédagogique', couleur: 'emerald' },
  { id: 'evenements', libelle: 'Calendrier scolaire', couleur: 'violet' },
];

const STATUTS = [
  { value: 'A_PLANIFIER', label: 'À planifier', classe: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'EN_COURS', label: 'En cours', classe: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'TERMINE', label: 'Terminé', classe: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export default function Programme() {
  const [onglet, setOnglet] = useState('coefficients');
  const [niveaux, setNiveaux] = useState([]);
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [niveauId, setNiveauId] = useState('');
  const [programme, setProgramme] = useState([]);
  const [valeurs, setValeurs] = useState({});
  const [planifications, setPlanifications] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [planification, setPlanification] = useState({
    classeId: '',
    matiereId: '',
    anneeScolaireId: '',
    periode: '',
    titre: '',
    objectifs: '',
    contenu: '',
    volumeHoraire: '',
    statut: 'A_PLANIFIER',
    datePrevue: '',
  });
  const [evenement, setEvenement] = useState({
    anneeScolaireId: '',
    titre: '',
    description: '',
    dateDebut: '',
    dateFin: '',
    cible: 'TOUS',
  });
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/niveaux'),
      api.get('/classes'),
      api.get('/matieres'),
      api.get('/annees-scolaires'),
    ])
      .then(([niveauxRes, classesRes, matieresRes, anneesRes]) => {
        setNiveaux(niveauxRes.data);
        setClasses(classesRes.data);
        setMatieres(matieresRes.data);
        setAnnees(anneesRes.data);
        setNiveauId(niveauxRes.data[0]?.id || '');
        const anneeActive = anneesRes.data.find((a) => a.active) || anneesRes.data[0];
        setPlanification((f) => ({
          ...f,
          anneeScolaireId: anneeActive?.id || '',
          classeId: classesRes.data[0]?.id || '',
          matiereId: matieresRes.data[0]?.id || '',
        }));
        setEvenement((f) => ({ ...f, anneeScolaireId: anneeActive?.id || '' }));
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  async function chargerProgramme() {
    if (!niveauId) return;
    const { data } = await api.get(`/niveaux/${niveauId}/programme`);
    setProgramme(data.programme);
    const initiales = {};
    data.programme.forEach((matiere) => {
      if (matiere.actif) initiales[matiere.matiereId] = matiere.coefficient;
    });
    setValeurs(initiales);
  }

  async function chargerDonnees() {
    const [plansRes, evenementsRes] = await Promise.all([
      api.get('/niveaux/planifications'),
      api.get('/niveaux/evenements'),
    ]);
    setPlanifications(plansRes.data);
    setEvenements(evenementsRes.data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    chargerProgramme().catch((err) =>
      setErreur(err.response?.data?.error || 'Erreur de chargement du programme')
    );
  }, [niveauId]);

  useEffect(() => {
    chargerDonnees().catch((err) =>
      setErreur(err.response?.data?.error || 'Erreur de chargement des planifications')
    );
  }, []);

  async function enregistrerCoefficients() {
    setEnregistrement(true);
    setErreur('');
    setMessageSucces('');
    try {
      const matieresAEnregistrer = Object.entries(valeurs)
        .filter(([, valeur]) => valeur !== '' && valeur !== null)
        .map(([matiereId, coefficient]) => ({
          matiereId,
          coefficient: parseFloat(coefficient),
        }));
      await api.put(`/niveaux/${niveauId}/programme`, { matieres: matieresAEnregistrer });
      await chargerProgramme();
      setMessageSucces('Coefficients enregistrés pour ce niveau.');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function enregistrerPlanification(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    setMessageSucces('');
    try {
      await api.post('/niveaux/planifications', planification);
      await chargerDonnees();
      setPlanification((f) => ({
        ...f,
        titre: '',
        objectifs: '',
        contenu: '',
        volumeHoraire: '',
        periode: '',
        datePrevue: '',
      }));
      setMessageSucces('Planification pédagogique ajoutée.');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'ajout de la planification");
    } finally {
      setEnregistrement(false);
    }
  }

  async function enregistrerEvenement(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    setMessageSucces('');
    try {
      await api.post('/niveaux/evenements', evenement);
      await chargerDonnees();
      setEvenement((f) => ({
        ...f,
        titre: '',
        description: '',
        dateDebut: '',
        dateFin: '',
      }));
      setMessageSucces('Événement scolaire ajouté au calendrier.');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'ajout de l'événement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimer(url, message) {
    try {
      await api.delete(url);
      await chargerDonnees();
      setMessageSucces(message);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  const inputClass =
    'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30';

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
          Pédagogie
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Programme scolaire</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Coefficients par niveau, objectifs par matière et calendrier de l’année
        </p>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ONGLETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOnglet(item.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
              onglet === item.id
                ? item.couleur === 'blue'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-lg shadow-blue-700/20'
                  : item.couleur === 'emerald'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-lg shadow-emerald-700/20'
                    : 'bg-violet-700 text-white border-violet-700 shadow-lg shadow-violet-700/20'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.libelle}
          </button>
        ))}
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

      {/* Coefficients */}
      {onglet === 'coefficients' && (
        <>
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 mb-5 max-w-md border-t-4 border-t-blue-500">
            <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">
              Niveau
            </label>
            <select
              className={inputClass}
              value={niveauId}
              onChange={(e) => setNiveauId(e.target.value)}
            >
              {niveaux.map((niveau) => (
                <option key={niveau.id} value={niveau.id}>
                  {niveau.libelle}
                  {niveau.filiere ? ` - ${niveau.filiere}` : ''} ({niveau.cycle})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5 max-w-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Inclure</th>
                  <th className="px-4 py-3 font-semibold">Matière</th>
                  <th className="px-4 py-3 font-semibold">Coefficient</th>
                  <th className="px-4 py-3 font-semibold">Origine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {programme.map((matiere) => {
                  const inclus = Object.prototype.hasOwnProperty.call(valeurs, matiere.matiereId);
                  return (
                    <tr key={matiere.matiereId} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={inclus}
                          onChange={(e) =>
                            setValeurs((v) => {
                              const suivant = { ...v };
                              if (e.target.checked) suivant[matiere.matiereId] = matiere.coefficient;
                              else delete suivant[matiere.matiereId];
                              return suivant;
                            })
                          }
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{matiere.nom}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          disabled={!inclus}
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                          value={valeurs[matiere.matiereId] ?? ''}
                          onChange={(e) =>
                            setValeurs((v) => ({ ...v, [matiere.matiereId]: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {matiere.personnalise ? (
                          <span className="text-blue-600 font-medium">Personnalisé</span>
                        ) : (
                          'Par défaut'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={enregistrerCoefficients}
            disabled={enregistrement || !niveauId}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
          >
            {enregistrement ? 'Enregistrement…' : 'Enregistrer les coefficients'}
          </button>
        </>
      )}

      {/* Planifications */}
      {onglet === 'planifications' && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          <form
            onSubmit={enregistrerPlanification}
            className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-3 border-t-4 border-t-emerald-500 h-fit"
          >
            <h2 className="font-semibold text-emerald-700 text-sm">Nouvelle séquence pédagogique</h2>
            <select
              className={inputClass}
              value={planification.classeId}
              onChange={(e) => setPlanification({ ...planification, classeId: e.target.value })}
              required
            >
              <option value="">Classe</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} — {c.niveau?.libelle}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={planification.matiereId}
              onChange={(e) => setPlanification({ ...planification, matiereId: e.target.value })}
              required
            >
              <option value="">Matière</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={planification.anneeScolaireId}
              onChange={(e) =>
                setPlanification({ ...planification, anneeScolaireId: e.target.value })
              }
              required
            >
              <option value="">Année scolaire</option>
              {annees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.libelle}
                  {a.active ? ' (active)' : ''}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Titre de la séquence"
              value={planification.titre}
              onChange={(e) => setPlanification({ ...planification, titre: e.target.value })}
              required
            />
            <textarea
              className={inputClass}
              placeholder="Objectifs pédagogiques"
              rows={2}
              value={planification.objectifs}
              onChange={(e) => setPlanification({ ...planification, objectifs: e.target.value })}
            />
            <textarea
              className={inputClass}
              placeholder="Contenu / activités prévues"
              rows={2}
              value={planification.contenu}
              onChange={(e) => setPlanification({ ...planification, contenu: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                step="0.5"
                className={inputClass}
                placeholder="Heures"
                value={planification.volumeHoraire}
                onChange={(e) =>
                  setPlanification({ ...planification, volumeHoraire: e.target.value })
                }
              />
              <input
                type="number"
                min="1"
                max="5"
                className={inputClass}
                placeholder="Bimestre"
                value={planification.periode}
                onChange={(e) => setPlanification({ ...planification, periode: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className={inputClass}
                value={planification.datePrevue}
                onChange={(e) => setPlanification({ ...planification, datePrevue: e.target.value })}
              />
              <select
                className={inputClass}
                value={planification.statut}
                onChange={(e) => setPlanification({ ...planification, statut: e.target.value })}
              >
                {STATUTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              disabled={enregistrement}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-600/20 transition"
            >
              {enregistrement ? 'Ajout…' : 'Ajouter la séquence'}
            </button>
          </form>

          <div className="space-y-3">
            {planifications.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
                Aucune planification enregistrée.
              </div>
            )}
            {planifications.map((item) => {
              const statutInfo = STATUTS.find((s) => s.value === item.statut);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-emerald-200 transition"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{item.titre}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.classe?.nom} · {item.matiere?.nom} ·{' '}
                        {item.periode ? `${item.periode}e bimestre` : 'Année'}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        supprimer(
                          `/niveaux/planifications/${item.id}`,
                          'Planification supprimée.'
                        )
                      }
                      className="text-xs font-medium text-red-600 hover:underline shrink-0"
                    >
                      Supprimer
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    {item.objectifs || 'Objectifs non renseignés.'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3 items-center">
                    <span className="text-xs text-slate-500">
                      {item.volumeHoraire ? `${item.volumeHoraire} h` : 'Volume non défini'}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        statutInfo?.classe || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {statutInfo?.label || item.statut}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Événements */}
      {onglet === 'evenements' && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          <form
            onSubmit={enregistrerEvenement}
            className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5 space-y-3 border-t-4 border-t-violet-500 h-fit"
          >
            <h2 className="font-semibold text-violet-700 text-sm">Ajouter une activité scolaire</h2>
            <select
              className={inputClass}
              value={evenement.anneeScolaireId}
              onChange={(e) => setEvenement({ ...evenement, anneeScolaireId: e.target.value })}
              required
            >
              <option value="">Année scolaire</option>
              {annees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.libelle}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Ex. Journée des écoles"
              value={evenement.titre}
              onChange={(e) => setEvenement({ ...evenement, titre: e.target.value })}
              required
            />
            <textarea
              className={inputClass}
              placeholder="Description et organisation"
              rows={2}
              value={evenement.description}
              onChange={(e) => setEvenement({ ...evenement, description: e.target.value })}
            />
            <input
              type="date"
              className={inputClass}
              value={evenement.dateDebut}
              onChange={(e) => setEvenement({ ...evenement, dateDebut: e.target.value })}
              required
            />
            <input
              type="date"
              className={inputClass}
              value={evenement.dateFin}
              onChange={(e) => setEvenement({ ...evenement, dateFin: e.target.value })}
            />
            <select
              className={inputClass}
              value={evenement.cible}
              onChange={(e) => setEvenement({ ...evenement, cible: e.target.value })}
            >
              <option value="TOUS">Toute l’école</option>
              <option value="PRESCOLAIRE">Préscolaire</option>
              <option value="PRIMAIRE">Primaire</option>
              <option value="SECONDAIRE">Secondaire</option>
              <option value="PERSONNEL">Personnel</option>
            </select>
            <button
              disabled={enregistrement}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 disabled:opacity-50 shadow-lg shadow-violet-600/20 transition"
            >
              {enregistrement ? 'Ajout…' : 'Ajouter au calendrier'}
            </button>
          </form>

          <div className="space-y-3">
            {evenements.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
                Aucun événement enregistré.
              </div>
            )}
            {evenements.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex justify-between gap-3 hover:border-violet-200 transition"
              >
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{item.titre}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(item.dateDebut).toLocaleDateString('fr-FR')}
                    {item.dateFin
                      ? ` → ${new Date(item.dateFin).toLocaleDateString('fr-FR')}`
                      : ''}{' '}
                    · {item.cible}
                  </p>
                  {item.description && (
                    <p className="text-sm text-slate-600 mt-2">{item.description}</p>
                  )}
                </div>
                <button
                  onClick={() =>
                    supprimer(`/niveaux/evenements/${item.id}`, 'Événement supprimé.')
                  }
                  className="text-xs font-medium text-red-600 hover:underline shrink-0"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}