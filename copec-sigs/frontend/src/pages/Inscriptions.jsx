import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Inscriptions() {
  const [classes, setClasses] = useState([]);
  const [classeSelectionnee, setClasseSelectionnee] = useState('');
  const [detailClasse, setDetailClasse] = useState(null);
  const [tousLesEleves, setTousLesEleves] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [eleveChoisi, setEleveChoisi] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/eleves')])
      .then(([resClasses, resEleves]) => {
        setClasses(resClasses.data);
        setTousLesEleves(resEleves.data);
        if (resClasses.data.length > 0) setClasseSelectionnee(resClasses.data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!classeSelectionnee) return;
    api
      .get(`/classes/${classeSelectionnee}`)
      .then(({ data }) => setDetailClasse(data))
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement de la classe'));
  }, [classeSelectionnee]);

  const idsDejaInscrits = new Set((detailClasse?.inscriptions || []).map((i) => i.eleve.id));
  const elevesDisponibles = tousLesEleves.filter((e) => !idsDejaInscrits.has(e.id));

  async function inscrire(e) {
    e.preventDefault();
    if (!eleveChoisi) return;
    setEnregistrement(true);
    setErreur('');
    try {
      await api.post('/inscriptions', {
        eleveId: eleveChoisi,
        classeId: classeSelectionnee,
        anneeScolaireId: detailClasse.anneeScolaireId,
      });
      const { data } = await api.get(`/classes/${classeSelectionnee}`);
      setDetailClasse(data);
      setModaleOuverte(false);
      setEleveChoisi('');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'inscription");
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-6">Inscriptions</h1>

      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

      <div className="mb-4">
        <label className="block text-sm mb-1">Classe</label>
        <select
          className="border rounded px-3 py-2 w-64"
          value={classeSelectionnee}
          onChange={(e) => setClasseSelectionnee(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom} ({c.niveau.libelle})
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-medium text-gray-700">
          Élèves inscrits {detailClasse ? `(${detailClasse.inscriptions.length})` : ''}
        </h2>
        <button
          onClick={() => setModaleOuverte(true)}
          disabled={!classeSelectionnee}
          className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
        >
          + Inscrire un élève
        </button>
      </div>

      {detailClasse && detailClasse.inscriptions.length === 0 && (
        <p className="text-gray-500">Aucun élève inscrit dans cette classe pour l'instant.</p>
      )}

      {detailClasse && detailClasse.inscriptions.length > 0 && (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Matricule</th>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Prénom</th>
                <th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {detailClasse.inscriptions.map((insc) => (
                <tr key={insc.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{insc.eleve.matricule}</td>
                  <td className="px-4 py-2">{insc.eleve.nom}</td>
                  <td className="px-4 py-2">{insc.eleve.prenom}</td>
                  <td className="px-4 py-2">{insc.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium mb-4">Inscrire un élève</h2>
            {elevesDisponibles.length === 0 ? (
              <p className="text-gray-500 text-sm">Tous les élèves sont déjà inscrits dans cette classe.</p>
            ) : (
              <form onSubmit={inscrire}>
                <label className="block text-sm mb-1">Élève</label>
                <select
                  className="w-full border rounded px-3 py-2 mb-4"
                  value={eleveChoisi}
                  onChange={(e) => setEleveChoisi(e.target.value)}
                  required
                >
                  <option value="">-- Choisir --</option>
                  {elevesDisponibles.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom} {e.prenom} ({e.matricule})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModaleOuverte(false)}
                    className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={enregistrement}
                    className="px-4 py-2 text-sm rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {enregistrement ? 'Inscription...' : 'Inscrire'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}