import { useEffect, useState } from 'react';
import api from '../api/client';

const ONGLETS = [
  { id: 'coefficients', libelle: 'Coefficients par niveau' },
  { id: 'planifications', libelle: 'Planification pédagogique' },
  { id: 'evenements', libelle: 'Calendrier scolaire' },
];

const STATUTS = [
  { value: 'A_PLANIFIER', label: 'À planifier' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINE', label: 'Terminé' },
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
  const [planification, setPlanification] = useState({ classeId: '', matiereId: '', anneeScolaireId: '', periode: '', titre: '', objectifs: '', contenu: '', volumeHoraire: '', statut: 'A_PLANIFIER', datePrevue: '' });
  const [evenement, setEvenement] = useState({ anneeScolaireId: '', titre: '', description: '', dateDebut: '', dateFin: '', cible: 'TOUS' });
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  useEffect(() => {
    Promise.all([api.get('/niveaux'), api.get('/classes'), api.get('/matieres'), api.get('/annees-scolaires')])
      .then(([niveauxRes, classesRes, matieresRes, anneesRes]) => {
        setNiveaux(niveauxRes.data);
        setClasses(classesRes.data);
        setMatieres(matieresRes.data);
        setAnnees(anneesRes.data);
        setNiveauId(niveauxRes.data[0]?.id || '');
        const anneeActive = anneesRes.data.find((annee) => annee.active) || anneesRes.data[0];
        setPlanification((formulaire) => ({ ...formulaire, anneeScolaireId: anneeActive?.id || '', classeId: classesRes.data[0]?.id || '', matiereId: matieresRes.data[0]?.id || '' }));
        setEvenement((formulaire) => ({ ...formulaire, anneeScolaireId: anneeActive?.id || '' }));
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
    const [plansRes, evenementsRes] = await Promise.all([api.get('/niveaux/planifications'), api.get('/niveaux/evenements')]);
    setPlanifications(plansRes.data);
    setEvenements(evenementsRes.data);
  }

  useEffect(() => {
    // Le niveau sélectionné pilote volontairement le chargement du programme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    chargerProgramme().catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement du programme'));
  }, [niveauId]);

  useEffect(() => {
    chargerDonnees().catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement des planifications'));
  }, []);

  async function enregistrerCoefficients() {
    setEnregistrement(true);
    setErreur('');
    setMessageSucces('');
    try {
      const matieresAEnregistrer = Object.entries(valeurs)
        .filter(([, valeur]) => valeur !== '' && valeur !== null)
        .map(([matiereId, coefficient]) => ({ matiereId, coefficient: parseFloat(coefficient) }));
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
      setPlanification((formulaire) => ({ ...formulaire, titre: '', objectifs: '', contenu: '', volumeHoraire: '', periode: '', datePrevue: '' }));
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
      setEvenement((formulaire) => ({ ...formulaire, titre: '', description: '', dateDebut: '', dateFin: '' }));
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

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-2">Programme scolaire</h1>
      <p className="text-gray-500 text-sm mb-5">Gérez les coefficients propres à chaque niveau, les objectifs par matière et les activités de l’année scolaire.</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {ONGLETS.map((item) => (
          <button key={item.id} type="button" onClick={() => setOnglet(item.id)} className={`px-4 py-2 rounded border text-sm ${onglet === item.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white hover:bg-slate-50'}`}>{item.libelle}</button>
        ))}
      </div>
      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}
      {messageSucces && <p className="text-green-600 text-sm mb-4">{messageSucces}</p>}

      {onglet === 'coefficients' && (
        <>
          <label className="block text-sm mb-1">Niveau</label>
          <select className="border rounded px-3 py-2 w-72 mb-5" value={niveauId} onChange={(e) => setNiveauId(e.target.value)}>
            {niveaux.map((niveau) => <option key={niveau.id} value={niveau.id}>{niveau.libelle}{niveau.filiere ? ` - ${niveau.filiere}` : ''} ({niveau.cycle})</option>)}
          </select>
          <div className="bg-white rounded border overflow-hidden mb-4 max-w-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left"><tr><th className="px-4 py-2">Inclure</th><th className="px-4 py-2">Matière</th><th className="px-4 py-2">Coefficient</th><th className="px-4 py-2">Origine</th></tr></thead>
              <tbody>{programme.map((matiere) => (
                <tr key={matiere.matiereId} className="border-t">
                  <td className="px-4 py-2"><input type="checkbox" checked={Object.prototype.hasOwnProperty.call(valeurs, matiere.matiereId)} onChange={(e) => setValeurs((v) => {
                    const suivant = { ...v };
                    if (e.target.checked) suivant[matiere.matiereId] = matiere.coefficient;
                    else delete suivant[matiere.matiereId];
                    return suivant;
                  })} /></td>
                  <td className="px-4 py-2">{matiere.nom}</td>
                  <td className="px-4 py-2"><input type="number" min="0.5" step="0.5" disabled={!Object.prototype.hasOwnProperty.call(valeurs, matiere.matiereId)} className="w-20 border rounded px-2 py-1 disabled:bg-gray-100" value={valeurs[matiere.matiereId] ?? ''} onChange={(e) => setValeurs((v) => ({ ...v, [matiere.matiereId]: e.target.value }))} /></td>
                  <td className="px-4 py-2 text-xs text-gray-500">{matiere.personnalise ? 'Personnalisé pour ce niveau' : 'Coefficient par défaut'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <button onClick={enregistrerCoefficients} disabled={enregistrement || !niveauId} className="bg-slate-800 text-white px-4 py-2 rounded text-sm disabled:opacity-50">{enregistrement ? 'Enregistrement...' : 'Enregistrer les coefficients'}</button>
        </>
      )}

      {onglet === 'planifications' && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          <form onSubmit={enregistrerPlanification} className="bg-white border rounded p-4 space-y-3">
            <h2 className="font-medium">Nouvelle séquence pédagogique</h2>
            <select className="w-full border rounded px-3 py-2 text-sm" value={planification.classeId} onChange={(e) => setPlanification({ ...planification, classeId: e.target.value })} required><option value="">Classe</option>{classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.nom} — {classe.niveau?.libelle}</option>)}</select>
            <select className="w-full border rounded px-3 py-2 text-sm" value={planification.matiereId} onChange={(e) => setPlanification({ ...planification, matiereId: e.target.value })} required><option value="">Matière</option>{matieres.map((matiere) => <option key={matiere.id} value={matiere.id}>{matiere.nom}</option>)}</select>
            <select className="w-full border rounded px-3 py-2 text-sm" value={planification.anneeScolaireId} onChange={(e) => setPlanification({ ...planification, anneeScolaireId: e.target.value })} required><option value="">Année scolaire</option>{annees.map((annee) => <option key={annee.id} value={annee.id}>{annee.libelle}{annee.active ? ' (active)' : ''}</option>)}</select>
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Titre de la séquence" value={planification.titre} onChange={(e) => setPlanification({ ...planification, titre: e.target.value })} required />
            <textarea className="w-full border rounded px-3 py-2 text-sm" placeholder="Objectifs pédagogiques" value={planification.objectifs} onChange={(e) => setPlanification({ ...planification, objectifs: e.target.value })} />
            <textarea className="w-full border rounded px-3 py-2 text-sm" placeholder="Contenu / activités prévues" value={planification.contenu} onChange={(e) => setPlanification({ ...planification, contenu: e.target.value })} />
            <div className="grid grid-cols-2 gap-2"><input type="number" min="1" step="0.5" className="border rounded px-3 py-2 text-sm" placeholder="Heures" value={planification.volumeHoraire} onChange={(e) => setPlanification({ ...planification, volumeHoraire: e.target.value })} /><input type="number" min="1" max="5" className="border rounded px-3 py-2 text-sm" placeholder="Bimestre" value={planification.periode} onChange={(e) => setPlanification({ ...planification, periode: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2"><input type="date" className="border rounded px-3 py-2 text-sm" value={planification.datePrevue} onChange={(e) => setPlanification({ ...planification, datePrevue: e.target.value })} /><select className="border rounded px-3 py-2 text-sm" value={planification.statut} onChange={(e) => setPlanification({ ...planification, statut: e.target.value })}>{STATUTS.map((statut) => <option key={statut.value} value={statut.value}>{statut.label}</option>)}</select></div>
            <button disabled={enregistrement} className="bg-slate-800 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Ajouter la séquence</button>
          </form>
          <div className="space-y-3">{planifications.length === 0 && <p className="text-gray-500 text-sm">Aucune planification enregistrée.</p>}{planifications.map((item) => <div key={item.id} className="bg-white border rounded p-4"><div className="flex justify-between gap-3"><div><h3 className="font-medium">{item.titre}</h3><p className="text-sm text-gray-500">{item.classe.nom} · {item.matiere.nom} · {item.periode ? `${item.periode}e bimestre` : 'Année'}</p></div><button onClick={() => supprimer(`/niveaux/planifications/${item.id}`, 'Planification supprimée.')} className="text-red-600 text-xs">Supprimer</button></div><p className="text-sm mt-2">{item.objectifs || 'Objectifs non renseignés.'}</p><p className="text-xs text-gray-500 mt-2">{item.volumeHoraire ? `${item.volumeHoraire} h` : 'Volume non défini'} · {STATUTS.find((statut) => statut.value === item.statut)?.label || item.statut}</p></div>)}</div>
        </div>
      )}

      {onglet === 'evenements' && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6">
          <form onSubmit={enregistrerEvenement} className="bg-white border rounded p-4 space-y-3">
            <h2 className="font-medium">Ajouter une activité scolaire</h2>
            <select className="w-full border rounded px-3 py-2 text-sm" value={evenement.anneeScolaireId} onChange={(e) => setEvenement({ ...evenement, anneeScolaireId: e.target.value })} required><option value="">Année scolaire</option>{annees.map((annee) => <option key={annee.id} value={annee.id}>{annee.libelle}</option>)}</select>
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Ex. Journée des écoles" value={evenement.titre} onChange={(e) => setEvenement({ ...evenement, titre: e.target.value })} required />
            <textarea className="w-full border rounded px-3 py-2 text-sm" placeholder="Description et organisation" value={evenement.description} onChange={(e) => setEvenement({ ...evenement, description: e.target.value })} />
            <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={evenement.dateDebut} onChange={(e) => setEvenement({ ...evenement, dateDebut: e.target.value })} required />
            <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={evenement.dateFin} onChange={(e) => setEvenement({ ...evenement, dateFin: e.target.value })} />
            <select className="w-full border rounded px-3 py-2 text-sm" value={evenement.cible} onChange={(e) => setEvenement({ ...evenement, cible: e.target.value })}><option value="TOUS">Toute l’école</option><option value="PRESCOLAIRE">Préscolaire</option><option value="PRIMAIRE">Primaire</option><option value="SECONDAIRE">Secondaire</option><option value="PERSONNEL">Personnel</option></select>
            <button disabled={enregistrement} className="bg-slate-800 text-white px-4 py-2 rounded text-sm disabled:opacity-50">Ajouter au calendrier</button>
          </form>
          <div className="space-y-3">{evenements.length === 0 && <p className="text-gray-500 text-sm">Aucun événement enregistré.</p>}{evenements.map((item) => <div key={item.id} className="bg-white border rounded p-4 flex justify-between gap-3"><div><h3 className="font-medium">{item.titre}</h3><p className="text-sm text-gray-500">{new Date(item.dateDebut).toLocaleDateString('fr-FR')}{item.dateFin ? ` → ${new Date(item.dateFin).toLocaleDateString('fr-FR')}` : ''} · {item.cible}</p><p className="text-sm mt-1">{item.description}</p></div><button onClick={() => supprimer(`/niveaux/evenements/${item.id}`, 'Événement supprimé.')} className="text-red-600 text-xs">Supprimer</button></div>)}</div>
        </div>
      )}
    </div>
  );
}
