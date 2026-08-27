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

export default function EmploiDuTemps() {
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [classeId, setClasseId] = useState('');

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
        if (resClasses.data.length > 0) setClasseId(resClasses.data[0].id);
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
      setErreur(err.response?.data?.error || 'Erreur de chargement de l\'emploi du temps');
    }
  }

  useEffect(() => {
    chargerSeances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeId]);

  function ouvrirModale() {
    setFormulaire({ matiereId: matieres[0]?.id || '', enseignantId: enseignants[0]?.enseignant?.id || enseignants[0]?.id || '', jour: 1, heureDebut: '08:00', heureFin: '09:00' });
    setErreur('');
    setModaleOuverte(true);
  }

  function majChamp(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur }));
  }

  async function soumettre(e) {
    e.preventDefault();
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
          disabled={enseignants.length === 0}
          className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
        >
          + Ajouter un créneau
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm mb-1">Classe</label>
        <select className="border rounded px-3 py-2 w-64" value={classeId} onChange={(e) => setClasseId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

      {enseignants.length === 0 && (
        <p className="text-orange-600 text-sm mb-4">
          Aucun enseignant enregistré — il faut d'abord en créer un (via l'API pour l'instant) avant de pouvoir ajouter un créneau.
        </p>
      )}

      <div className="grid grid-cols-6 gap-3">
        {JOURS.map((jour) => (
          <div key={jour.valeur} className="bg-white border rounded">
            <div className="bg-gray-100 px-3 py-2 font-medium text-sm border-b">{jour.libelle}</div>
            <div className="p-2 space-y-2 min-h-[100px]">
              {seances
                .filter((s) => s.jour === jour.valeur)
                .map((s) => (
                  <div key={s.id} className="bg-slate-50 border rounded p-2 text-xs relative group">
                    <div className="font-medium">{s.matiere.nom}</div>
                    <div className="text-gray-500">{s.heureDebut} - {s.heureFin}</div>
                    <div className="text-gray-500">{s.enseignant.utilisateur.nom}</div>
                    <button
                      onClick={() => supprimer(s.id)}
                      className="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
                <select className="w-full border rounded px-3 py-2" value={formulaire.matiereId} onChange={(e) => majChamp('matiereId', e.target.value)} required>
                  {matieres.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Enseignant</label>
                <select className="w-full border rounded px-3 py-2" value={formulaire.enseignantId} onChange={(e) => majChamp('enseignantId', e.target.value)} required>
                  {enseignants.map((ens) => (
                    <option key={ens.id} value={ens.id}>{ens.utilisateur.nom} {ens.utilisateur.prenom}</option>
                  ))}
                </select>
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
                <button type="submit" disabled={enregistrement} className="px-4 py-2 text-sm rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50">
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