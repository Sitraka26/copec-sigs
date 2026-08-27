import { useEffect, useState } from 'react';
import api from '../api/client';

const PERIODES = [1, 2, 3, 4, 5];
const NOMS_PERIODES = { 1: '1er Bimestre', 2: '2ème Bimestre', 3: '3ème Bimestre', 4: '4ème Bimestre', 5: '5ème Bimestre' };

export default function Notes() {
  const [classes, setClasses] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [periode, setPeriode] = useState(1);

  const [grille, setGrille] = useState(null);
  const [valeurs, setValeurs] = useState({});
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/matieres')])
      .then(([resClasses, resMatieres]) => {
        setClasses(resClasses.data);
        setMatieres(resMatieres.data);
        if (resClasses.data.length > 0) setClasseId(resClasses.data[0].id);
        if (resMatieres.data.length > 0) setMatiereId(resMatieres.data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!classeId || !matiereId || !periode) return;
    setErreur('');
    setMessageSucces('');
    api
      .get('/notes/saisie', { params: { classeId, matiereId, periode } })
      .then(({ data }) => {
        setGrille(data);
        const initiales = {};
        data.eleves.forEach((e) => {
          initiales[e.eleveId] = e.note ?? '';
        });
        setValeurs(initiales);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement de la grille'));
  }, [classeId, matiereId, periode]);

  function majNote(eleveId, valeur) {
    setValeurs((v) => ({ ...v, [eleveId]: valeur }));
  }

  async function enregistrer() {
    setEnregistrement(true);
    setErreur('');
    setMessageSucces('');
    try {
      const notes = Object.entries(valeurs)
        .filter(([, v]) => v !== '' && v !== null)
        .map(([eleveId, v]) => ({ eleveId, valeur: parseFloat(v) }));

      await api.post('/notes/saisie', { classeId, matiereId, periode, notes });
      setMessageSucces('Notes enregistrées avec succès.');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-6">Saisie des notes</h1>

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
          <label className="block text-sm mb-1">Matière</label>
          <select className="border rounded px-3 py-2" value={matiereId} onChange={(e) => setMatiereId(e.target.value)}>
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>{m.nom} (coef. {m.coefficient})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Période</label>
          <select className="border rounded px-3 py-2" value={periode} onChange={(e) => setPeriode(Number(e.target.value))}>
            {PERIODES.map((p) => (
              <option key={p} value={p}>{NOMS_PERIODES[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}
      {messageSucces && <p className="text-green-600 text-sm mb-4">{messageSucces}</p>}

      {grille && grille.eleves.length === 0 && (
        <p className="text-gray-500">Aucun élève inscrit dans cette classe.</p>
      )}

      {grille && grille.eleves.length > 0 && (
        <>
          <div className="bg-white rounded border overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-4 py-2">Matricule</th>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Prénom</th>
                  <th className="px-4 py-2 w-32">Note / 20</th>
                </tr>
              </thead>
              <tbody>
                {grille.eleves.map((eleve) => (
                  <tr key={eleve.eleveId} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{eleve.matricule}</td>
                    <td className="px-4 py-2">{eleve.nom}</td>
                    <td className="px-4 py-2">{eleve.prenom}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        className="w-20 border rounded px-2 py-1"
                        value={valeurs[eleve.eleveId] ?? ''}
                        onChange={(e) => majNote(eleve.eleveId, e.target.value)}
                      />
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
            {enregistrement ? 'Enregistrement...' : 'Enregistrer les notes'}
          </button>
        </>
      )}
    </div>
  );
}