import { useEffect, useState } from 'react';
import api from '../api/client';

const CHAMPS_VIDES = {
  matricule: '',
  nom: '',
  prenom: '',
  dateNaissance: '',
  sexe: 'M',
  adresse: '',
  contactUrgenceNom: '',
  contactUrgenceTel: '',
};

export default function Eleves() {
  const [eleves, setEleves] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [formulaire, setFormulaire] = useState(CHAMPS_VIDES);
  const [enregistrement, setEnregistrement] = useState(false);

  async function chargerEleves() {
    setChargement(true);
    try {
      const { data } = await api.get('/eleves');
      setEleves(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement des élèves');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerEleves();
  }, []);

  function ouvrirModale() {
    setFormulaire(CHAMPS_VIDES);
    setErreur('');
    setModaleOuverte(true);
  }

  async function soumettre(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    try {
      await api.post('/eleves', formulaire);
      setModaleOuverte(false);
      await chargerEleves();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  function majChamp(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur }));
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium">Élèves</h1>
        <button
          onClick={ouvrirModale}
          className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700"
        >
          + Ajouter un élève
        </button>
      </div>

      {erreur && !modaleOuverte && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

      {chargement ? (
        <p className="text-gray-500">Chargement...</p>
      ) : eleves.length === 0 ? (
        <p className="text-gray-500">Aucun élève enregistré pour l'instant.</p>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Matricule</th>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Prénom</th>
                <th className="px-4 py-2">Sexe</th>
                <th className="px-4 py-2">Date de naissance</th>
              </tr>
            </thead>
            <tbody>
              {eleves.map((eleve) => (
                <tr key={eleve.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{eleve.matricule}</td>
                  <td className="px-4 py-2">{eleve.nom}</td>
                  <td className="px-4 py-2">{eleve.prenom}</td>
                  <td className="px-4 py-2">{eleve.sexe}</td>
                  <td className="px-4 py-2">{new Date(eleve.dateNaissance).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Ajouter un élève</h2>
            {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
            <form onSubmit={soumettre} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Matricule *</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.matricule}
                  onChange={(e) => majChamp('matricule', e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Nom *</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={formulaire.nom}
                    onChange={(e) => majChamp('nom', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Prénom *</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={formulaire.prenom}
                    onChange={(e) => majChamp('prenom', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Date de naissance *</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={formulaire.dateNaissance}
                    onChange={(e) => majChamp('dateNaissance', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Sexe *</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={formulaire.sexe}
                    onChange={(e) => majChamp('sexe', e.target.value)}
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Adresse</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.adresse}
                  onChange={(e) => majChamp('adresse', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Contact urgence (nom)</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={formulaire.contactUrgenceNom}
                    onChange={(e) => majChamp('contactUrgenceNom', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Contact urgence (tél.)</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={formulaire.contactUrgenceTel}
                    onChange={(e) => majChamp('contactUrgenceTel', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  {enregistrement ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
