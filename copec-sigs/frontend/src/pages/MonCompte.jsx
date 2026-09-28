import { useState } from 'react';
import api from '../api/client';

export default function MonCompte() {
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setErreur('');
    setMessageSucces('');

    if (nouveauMotDePasse !== confirmation) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setEnregistrement(true);
    try {
      await api.post('/auth/changer-mot-de-passe', { ancienMotDePasse, nouveauMotDePasse });
      setMessageSucces('Mot de passe modifié avec succès.');
      setAncienMotDePasse('');
      setNouveauMotDePasse('');
      setConfirmation('');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors du changement de mot de passe");
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-2">Mon compte</h1>
      <p className="text-gray-500 text-sm mb-6">
        {utilisateur?.prenom} {utilisateur?.nom} — {utilisateur?.role}
      </p>

      <div className="bg-white border rounded p-6 max-w-sm">
        <h2 className="font-medium mb-4">Changer mon mot de passe</h2>
        {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
        {messageSucces && <p className="text-green-600 text-sm mb-3">{messageSucces}</p>}
        <form onSubmit={soumettre} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Mot de passe actuel</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={ancienMotDePasse}
              onChange={(e) => setAncienMotDePasse(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={enregistrement}
            className="w-full bg-slate-800 text-white rounded py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {enregistrement ? 'Enregistrement...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}