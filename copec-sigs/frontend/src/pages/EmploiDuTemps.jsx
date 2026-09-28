import { useEffect, useState } from 'react';
import api from '../api/client';

const JOURS = [
  { valeur: 1, libelle: 'Lundi' },
  { valeur: 2, libelle: 'Mardi' },
  { valeur: 3, libelle: 'Mercredi' },
  { valeur: 4, libelle: 'Jeudi' },
  { valeur: 5, libelle: 'Vendredi' },
  { valeur: 6, libelle: 'Samedi' },
];

function obtenirCycle(classe) {
  if (classe.niveau?.cycle) return classe.niveau.cycle;
  const libelle = (classe.niveau?.libelle || classe.nom || '').toLowerCase();
  if (libelle.includes('préscol') || libelle.includes('prescol')) return 'PRESCOLAIRE';
  if (['cp', 'ce1', 'ce2', 'cm1', 'cm2'].some((niveau) => libelle.startsWith(niveau))) return 'PRIMAIRE';
  if (['6ème', '5ème', '4ème', '3ème', '6eme', '5eme', '4eme', '3eme'].some((niveau) => libelle.startsWith(niveau))) return 'COLLEGE';
  if (['2nde', 'seconde', '1ère', '1ere', 'terminale'].some((niveau) => libelle.startsWith(niveau))) return 'LYCEE';
  return null;
}

const SECTIONS = [
  { valeur: 'PRESCOLAIRE', libelle: 'Préscolaire', cycles: ['PRESCOLAIRE'] },
  { valeur: 'PRIMAIRE', libelle: 'Primaire', cycles: ['PRIMAIRE'] },
  { valeur: 'SECONDAIRE', libelle: 'Secondaire', cycles: ['COLLEGE', 'LYCEE'] },
];

// Couleur déterministe par matière (même matière = toujours la même couleur)
const PALETTE = [
  'bg-blue-50 border-blue-300 text-blue-900',
  'bg-emerald-50 border-emerald-300 text-emerald-900',
  'bg-amber-50 border-amber-300 text-amber-900',
  'bg-purple-50 border-purple-300 text-purple-900',
  'bg-rose-50 border-rose-300 text-rose-900',
  'bg-cyan-50 border-cyan-300 text-cyan-900',
  'bg-lime-50 border-lime-300 text-lime-900',
  'bg-orange-50 border-orange-300 text-orange-900',
];
function couleurMatiere(nom) {
  let hash = 0;
  for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function EmploiDuTemps() {
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [sectionActive, setSectionActive] = useState('PRESCOLAIRE');
  const [cycleSecondaire, setCycleSecondaire] = useState('TOUS');

  const [seances, setSeances] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);

  const [formulaire, setFormulaire] = useState({
    matiereId: '',
    enseignantId: '',
    jour: 1,
    heureDebut: '08:00',
    heureFin: '09:00',
  });

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/matieres'), api.get('/enseignants')])
      .then(([resClasses, resMatieres, resEnseignants]) => {
        setClasses(resClasses.data);
        setMatieres(resMatieres.data);
        setEnseignants(resEnseignants.data);
        if (resClasses.data.length > 0) {
          const section = SECTIONS.find((item) => resClasses.data.some((classe) => item.cycles.includes(obtenirCycle(classe)))) || SECTIONS[0];
          setSectionActive(section.valeur);
          setClasseId(resClasses.data.find((classe) => section.cycles.includes(obtenirCycle(classe)))?.id || resClasses.data[0].id);
        }
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  async function chargerSeances() {
    if (!classeId) return;
    try {
      const { data } = await api.get('/emplois-du-temps', { params: { classeId } });
      setSeances(data);
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur de chargement de l'emploi du temps");
    }
  }

  useEffect(() => {
    chargerSeances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeId]);

  const sectionSelectionnee = SECTIONS.find((section) => section.valeur === sectionActive) || SECTIONS[0];
  const classesVisibles = classes.filter((classe) => (
    sectionSelectionnee.cycles.includes(obtenirCycle(classe))
    && (sectionActive !== 'SECONDAIRE' || cycleSecondaire === 'TOUS' || obtenirCycle(classe) === cycleSecondaire)
  ));
  const classeSelectionnee = classes.find((classe) => classe.id === classeId);
  const estSecondaire = ['COLLEGE', 'LYCEE'].includes(obtenirCycle(classeSelectionnee || {}));
  // Enseignants habilités pour la matière actuellement choisie dans le formulaire
  const enseignantsPourMatiere = estSecondaire
    ? enseignants.filter((ens) => ens.matieres?.length >= 1 && ens.matieres?.length <= 2
      && ens.matieres.some((matiere) => matiere.matiereId === formulaire.matiereId))
    : enseignants;
  const enseignantsSecondaireDisponibles = enseignants.filter((ens) => (
    ens.matieres?.length >= 1 && ens.matieres?.length <= 2
  ));
  const peutAjouterCreneau = Boolean(classeId)
    && (estSecondaire ? enseignantsSecondaireDisponibles.length > 0 : enseignants.length > 0);

  useEffect(() => {
    if (classesVisibles.length === 0) {
      if (classeId) setClasseId('');
      return;
    }
    if (!classesVisibles.some((classe) => classe.id === classeId)) setClasseId(classesVisibles[0].id);
  }, [sectionActive, cycleSecondaire, classesVisibles, classeId]);

  const limitesHoraires = estSecondaire
    ? { matinFin: '12:00', apresMidiDebut: '13:00', apresMidiFin: '18:00' }
    : { matinFin: '11:30', apresMidiDebut: '13:00', apresMidiFin: '16:30' };
  const seancesDuJour = (jour) => seances.filter((seance) => seance.jour === jour);

  function ouvrirModale() {
    const premiereMatiere = estSecondaire
      ? matieres.find((matiere) => enseignantsSecondaireDisponibles.some((enseignant) => (
        enseignant.matieres.some((matiereEnseignee) => matiereEnseignee.matiereId === matiere.id)
      )))?.id || ''
      : matieres[0]?.id || '';
    const enseignantsCompatibles = estSecondaire
      ? enseignants.filter((ens) => ens.matieres?.length >= 1 && ens.matieres?.length <= 2
        && ens.matieres.some((matiere) => matiere.matiereId === premiereMatiere))
      : enseignants;
    setFormulaire({
      matiereId: premiereMatiere,
      enseignantId: enseignantsCompatibles[0]?.id || '',
      jour: 1,
      heureDebut: '08:00',
      heureFin: '09:00',
    });
    setErreur('');
    setModaleOuverte(true);
  }

  function changerMatiere(matiereId) {
    const enseignantsCompatibles = estSecondaire
      ? enseignants.filter((ens) => ens.matieres?.length >= 1 && ens.matieres?.length <= 2
        && ens.matieres.some((matiere) => matiere.matiereId === matiereId))
      : enseignants;
    setFormulaire((f) => ({ ...f, matiereId, enseignantId: enseignantsCompatibles[0]?.id || '' }));
  }

  function majChamp(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur }));
  }

  async function soumettre(e) {
    e.preventDefault();
    if (!formulaire.enseignantId) {
      setErreur('Aucun enseignant habilité pour cette matière. Assignez-en un depuis la gestion des enseignants.');
      return;
    }
    const { heureDebut, heureFin } = formulaire;
    const estMatin = heureDebut < limitesHoraires.matinFin;
    const horaireValide = estMatin
      ? heureFin <= limitesHoraires.matinFin
      : heureDebut >= limitesHoraires.apresMidiDebut && heureFin <= limitesHoraires.apresMidiFin;
    if (!horaireValide) {
      setErreur(`Horaire invalide : matin jusqu'à ${limitesHoraires.matinFin}, après-midi de ${limitesHoraires.apresMidiDebut} à ${limitesHoraires.apresMidiFin}.`);
      return;
    }
    setEnregistrement(true);
    setErreur('');
    try {
      await api.post('/emplois-du-temps', { classeId, ...formulaire, jour: Number(formulaire.jour) });
      setModaleOuverte(false);
      await chargerSeances();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimer(id) {
    try {
      await api.delete(`/emplois-du-temps/${id}`);
      await chargerSeances();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium">Emploi du temps</h1>
        <button
          onClick={ouvrirModale}
          disabled={!peutAjouterCreneau}
          title={!classeId ? 'Sélectionnez d’abord une classe' : !peutAjouterCreneau ? 'Aucun enseignant compatible' : 'Ajouter un créneau'}
          className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Ajouter un créneau
        </button>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <button key={section.valeur} type="button" onClick={() => setSectionActive(section.valeur)}
              className={`px-4 py-2 rounded text-sm border ${sectionActive === section.valeur ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
              {section.libelle}
            </button>
          ))}
        </div>
        {sectionActive === 'SECONDAIRE' && (
          <div className="flex gap-2">
            {[
              { valeur: 'TOUS', libelle: 'Tous les cycles' },
              { valeur: 'COLLEGE', libelle: '1er cycle (Collège)' },
              { valeur: 'LYCEE', libelle: '2e cycle (Lycée)' },
            ].map((cycle) => (
              <button key={cycle.valeur} type="button" onClick={() => setCycleSecondaire(cycle.valeur)}
                className={`px-3 py-1.5 rounded text-xs border ${cycleSecondaire === cycle.valeur ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-50'}`}>
                {cycle.libelle}
              </button>
            ))}
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">Classe</label>
          <select className="border rounded px-3 py-2 w-64" value={classeId} onChange={(e) => setClasseId(e.target.value)} disabled={classesVisibles.length === 0}>
            {classesVisibles.map((c) => (
              <option key={c.id} value={c.id}>{c.nom} — {c.niveau?.libelle || 'Niveau non renseigné'}</option>
            ))}
          </select>
        </div>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

      {!classeId && (
        <p className="text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-2 text-sm mb-4">
          Impossible d'ajouter un créneau : aucune classe n'est disponible dans cette section.
          Sélectionnez une autre section ou créez d'abord une classe dans le menu Classes.
        </p>
      )}

      {enseignants.length === 0 && (
        <p className="text-orange-600 text-sm mb-4">
          Aucun enseignant enregistré — il faut d'abord en créer un avant de pouvoir ajouter un créneau.
        </p>
      )}

      {classeSelectionnee && (
        <p className="text-slate-600 text-sm mb-4">
          Règle active : {estSecondaire
            ? 'au secondaire, l’enseignant doit être affecté à la matière choisie et peut avoir deux matières maximum.'
            : 'au préscolaire et au primaire, un seul enseignant reste responsable de toutes les matières de la classe.'}
        </p>
      )}

      {classeSelectionnee && (
        <p className="text-xs text-slate-500 mb-4">
          Horaires autorisés : matin jusqu'à {limitesHoraires.matinFin} ; après-midi de {limitesHoraires.apresMidiDebut} à {limitesHoraires.apresMidiFin}.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {JOURS.map((jour) => (
          <div key={jour.valeur} className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-800 text-white px-3 py-2 font-medium text-sm">{jour.libelle}</div>
            <div className="p-2 space-y-3">
              {[
                { libelle: `Matin · jusqu'à ${limitesHoraires.matinFin}`, debut: '00:00', fin: limitesHoraires.matinFin },
                { libelle: `Après-midi · jusqu'à ${limitesHoraires.apresMidiFin}`, debut: limitesHoraires.apresMidiDebut, fin: '23:59' },
              ].map((periode) => {
                const seancesPeriode = seancesDuJour(jour.valeur).filter((seance) => seance.heureDebut >= periode.debut && seance.heureDebut < periode.fin);
                return (
                  <div key={periode.libelle} className="border rounded p-2 min-h-[80px]">
                    <div className="text-[11px] font-semibold text-slate-500 mb-2">{periode.libelle}</div>
                    <div className="space-y-2">
                      {seancesPeriode.map((s) => (
                        <div key={s.id} className={`border-l-4 rounded p-2 text-xs relative group ${couleurMatiere(s.matiere.nom)}`}>
                          <div className="font-semibold">{s.matiere.nom}</div>
                          <div className="opacity-75">{s.heureDebut} - {s.heureFin}</div>
                          <div className="opacity-75">{s.enseignant.utilisateur.nom}</div>
                          <button onClick={() => supprimer(s.id)} className="absolute top-1 right-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-xs font-bold" title="Supprimer cette séance">✕</button>
                        </div>
                      ))}
                      {seancesPeriode.length === 0 && <div className="text-xs text-gray-300 text-center">—</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium mb-4">Ajouter un créneau</h2>
            {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
            <form onSubmit={soumettre} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Matière</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.matiereId}
                  onChange={(e) => changerMatiere(e.target.value)}
                  required
                >
                  {matieres.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Enseignant                   <span className="text-gray-400 font-normal">
                    {estSecondaire ? '(habilités pour cette matière)' : '(enseignant unique de la classe)'}
                  </span>
                </label>
                {enseignantsPourMatiere.length === 0 ? (
                  <p className="text-orange-600 text-xs bg-orange-50 border border-orange-200 rounded px-3 py-2">
                    {estSecondaire
                      ? "Aucun enseignant n'est habilité pour cette matière."
                      : "Aucun enseignant n'est disponible pour cette classe."}
                  </p>
                ) : (
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={formulaire.enseignantId}
                    onChange={(e) => majChamp('enseignantId', e.target.value)}
                    required
                  >
                    {enseignantsPourMatiere.map((ens) => (
                      <option key={ens.id} value={ens.id}>{ens.utilisateur.nom} {ens.utilisateur.prenom}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">Jour</label>
                <select className="w-full border rounded px-3 py-2" value={formulaire.jour} onChange={(e) => majChamp('jour', e.target.value)}>
                  {JOURS.map((j) => (
                    <option key={j.valeur} value={j.valeur}>{j.libelle}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Heure début</label>
                  <input type="time" className="w-full border rounded px-3 py-2" value={formulaire.heureDebut} onChange={(e) => majChamp('heureDebut', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm mb-1">Heure fin</label>
                  <input type="time" className="w-full border rounded px-3 py-2" value={formulaire.heureFin} onChange={(e) => majChamp('heureFin', e.target.value)} required />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModaleOuverte(false)} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enregistrement || enseignantsPourMatiere.length === 0}
                  className="px-4 py-2 text-sm rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {enregistrement ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}