import { useEffect, useState, useMemo } from 'react';
import api from '../api/client';

const CHAMPS_VIDES = { nom: '', prenom: '', email: '', telephone: '' };

export default function Enseignants() {
  const [enseignants, setEnseignants] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [mdpTemporaire, setMdpTemporaire] = useState(null); // { email, mdp }

  const [modaleAjout, setModaleAjout] = useState(false);
  const [modaleVoir, setModaleVoir] = useState(false);
  const [modaleEdit, setModaleEdit] = useState(false);
  const [modaleMatieres, setModaleMatieres] = useState(false);

  const [formulaire, setFormulaire] = useState(CHAMPS_VIDES);
  const [editionId, setEditionId] = useState(null);
  const [enseignantSelectionne, setEnseignantSelectionne] = useState(null);

  const [matieres, setMatieres] = useState([]);
  const [matieresSelectionnees, setMatieresSelectionnees] = useState([]);

  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_TAILLE = 10;

  async function chargerEnseignants() {
    setChargement(true);
    setErreur('');
    try {
      const { data } = await api.get('/enseignants');
      setEnseignants(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement des enseignants');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerEnseignants();
    api.get('/matieres').then((r) => setMatieres(r.data)).catch(() => {});
  }, []);

  const filtrés = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return enseignants;
    return enseignants.filter((e) =>
      `${e.utilisateur.nom} ${e.utilisateur.prenom} ${e.utilisateur.email || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [enseignants, recherche]);

  const pages = Math.max(1, Math.ceil(filtrés.length / PAGE_TAILLE));
  const affichage = filtrés.slice((page - 1) * PAGE_TAILLE, page * PAGE_TAILLE);

  function majChamp(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur }));
  }

  function ouvrirAjout() {
    setFormulaire(CHAMPS_VIDES);
    setErreur('');
    setMdpTemporaire(null);
    setModaleAjout(true);
  }

  async function soumettreAjout(e) {
    e.preventDefault();
    setErreur('');
    try {
      const { data } = await api.post('/enseignants', formulaire);
      setModaleAjout(false);
      setMdpTemporaire({
        email: data.utilisateur?.email || formulaire.email,
        mdp: data.motDePasseTemporaire,
      });
      setMessage('Enseignant créé avec succès.');
      await chargerEnseignants();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la création');
    }
  }

  function ouvrirVoir(ens) {
    setEnseignantSelectionne(ens);
    setModaleVoir(true);
  }

  function ouvrirEdit(ens) {
    setEditionId(ens.id);
    setFormulaire({
      nom: ens.utilisateur.nom,
      prenom: ens.utilisateur.prenom,
      email: ens.utilisateur.email,
      telephone: ens.telephone || '',
    });
    setModaleEdit(true);
  }

  async function soumettreEdit(e) {
    e.preventDefault();
    setErreur('');
    try {
      await api.put(`/enseignants/${editionId}`, formulaire);
      setModaleEdit(false);
      setMessage('Enseignant mis à jour');
      await chargerEnseignants();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  }

  function ouvrirMatieres(ens) {
    setEnseignantSelectionne(ens);
    setMatieresSelectionnees(
      (ens.matieres || []).map((m) => m.matiereId || m.matiere?.id || m.id)
    );
    setModaleMatieres(true);
  }

  function toggleMatiere(id) {
    setMatieresSelectionnees((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function soumettreMatieres(e) {
    e.preventDefault();
    setErreur('');
    try {
      await api.patch(`/enseignants/${enseignantSelectionne.id}/matieres`, {
        matiereIds: matieresSelectionnees,
      });
      setModaleMatieres(false);
      setMessage('Matières mises à jour');
      await chargerEnseignants();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'assignation des matières");
    }
  }

  async function reinitialiser(ens) {
    if (!confirm(`Réinitialiser le mot de passe de ${ens.utilisateur.nom} ${ens.utilisateur.prenom} ?`)) {
      return;
    }
    try {
      const { data } = await api.post(`/enseignants/${ens.id}/reset-password`);
      setMdpTemporaire({
        email: ens.utilisateur.email,
        mdp: data.motDePasseTemporaire,
      });
      setMessage('Mot de passe réinitialisé.');
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la réinitialisation');
    }
  }

  async function supprimer(ens) {
    if (!confirm(`Supprimer définitivement ${ens.utilisateur.nom} ${ens.utilisateur.prenom} ?`)) {
      return;
    }
    try {
      await api.delete(`/enseignants/${ens.id}`);
      setMessage('Enseignant supprimé');
      await chargerEnseignants();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  function exporterCSV() {
    const rows = [['Nom', 'Prénom', 'Email', 'Téléphone', 'Matières']];
    for (const e of filtrés) {
      rows.push([
        e.utilisateur.nom,
        e.utilisateur.prenom,
        e.utilisateur.email || '',
        e.telephone || '',
        (e.matieres || []).map((m) => m.matiere?.nom || m.matiereId).join('; '),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enseignants.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium">Enseignants</h1>
        <div className="flex gap-2">
          <button
            onClick={ouvrirAjout}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700"
          >
            + Ajouter
          </button>
          <button onClick={exporterCSV} className="px-3 py-2 rounded border hover:bg-gray-50 text-sm">
            Exporter CSV
          </button>
        </div>
      </div>

      {message && <p className="text-green-600 text-sm mb-2">{message}</p>}
      {erreur && <p className="text-red-600 text-sm mb-2">{erreur}</p>}

      {/* Mot de passe temporaire — affiché une seule fois */}
      {mdpTemporaire && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl text-sm">
          <p className="font-semibold text-amber-900 mb-1">Identifiants à communiquer</p>
          <p className="text-amber-800">
            Email : <strong>{mdpTemporaire.email}</strong>
          </p>
          <p className="text-amber-800 mt-1">
            Mot de passe temporaire :{' '}
            <strong className="text-base tracking-wide font-mono">{mdpTemporaire.mdp}</strong>
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Notez-le maintenant : il ne sera plus affiché ensuite.
          </p>
          <button
            type="button"
            onClick={() => setMdpTemporaire(null)}
            className="mt-2 text-xs text-amber-700 underline"
          >
            Fermer
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Rechercher par nom, prénom ou email"
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {chargement ? (
        <p className="text-gray-500">Chargement...</p>
      ) : affichage.length === 0 ? (
        <p className="text-gray-500">Aucun enseignant trouvé.</p>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Prénom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Matières</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affichage.map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{e.utilisateur.nom}</td>
                  <td className="px-4 py-2">{e.utilisateur.prenom}</td>
                  <td className="px-4 py-2">{e.utilisateur.email}</td>
                  <td className="px-4 py-2">{e.telephone || ''}</td>
                  <td className="px-4 py-2">
                    {(e.matieres || []).map((m) => m.matiere?.nom || '').join(', ')}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => ouvrirVoir(e)} className="text-slate-700 text-sm px-2 py-1 border rounded">
                        Voir
                      </button>
                      <button onClick={() => ouvrirEdit(e)} className="text-blue-700 text-sm px-2 py-1 border rounded">
                        Modifier
                      </button>
                      <button onClick={() => ouvrirMatieres(e)} className="text-amber-700 text-sm px-2 py-1 border rounded">
                        Matières
                      </button>
                      <button onClick={() => reinitialiser(e)} className="text-green-700 text-sm px-2 py-1 border rounded">
                        Réinit. mdp
                      </button>
                      <button onClick={() => supprimer(e)} className="text-red-600 text-sm px-2 py-1 border rounded">
                        Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Page {page} / {pages}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded border">
            Préc
          </button>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} className="px-3 py-1 rounded border">
            Suiv
          </button>
        </div>
      </div>

      {modaleAjout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Ajouter un enseignant</h2>
            {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
            <form onSubmit={soumettreAjout} className="space-y-3">
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
              <div>
                <label className="block text-sm mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.email}
                  onChange={(e) => majChamp('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Téléphone</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.telephone}
                  onChange={(e) => majChamp('telephone', e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">
                Un mot de passe temporaire sera généré et affiché une seule fois après la création.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModaleAjout(false)}
                  className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded text-sm">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modaleVoir && enseignantSelectionne && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Détails enseignant</h2>
            <p className="font-medium">
              {enseignantSelectionne.utilisateur.nom} {enseignantSelectionne.utilisateur.prenom}
            </p>
            <p>{enseignantSelectionne.utilisateur.email}</p>
            <p>{enseignantSelectionne.telephone || ''}</p>
            <p className="mt-2 font-medium">Matières</p>
            <ul className="list-disc ml-5">
              {(enseignantSelectionne.matieres || []).map((m) => (
                <li key={m.id || m.matiere?.id}>{m.matiere?.nom || m.matiereId}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 pt-4">
              <a
                href={`/emploi-du-temps?enseignantId=${enseignantSelectionne.id}`}
                className="px-3 py-2 rounded border text-sm"
              >
                Voir emploi du temps
              </a>
              <button
                onClick={() => setModaleVoir(false)}
                className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {modaleEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Modifier enseignant</h2>
            {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
            <form onSubmit={soumettreEdit} className="space-y-3">
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
              <div>
                <label className="block text-sm mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.email}
                  onChange={(e) => majChamp('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Téléphone</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.telephone}
                  onChange={(e) => majChamp('telephone', e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModaleEdit(false)}
                  className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded text-sm">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modaleMatieres && enseignantSelectionne && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-medium mb-4">
              Assigner matières — {enseignantSelectionne.utilisateur.nom}{' '}
              {enseignantSelectionne.utilisateur.prenom}
            </h2>
            <form onSubmit={soumettreMatieres} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {matieres.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 border rounded px-3 py-2">
                    <input
                      type="checkbox"
                      checked={matieresSelectionnees.includes(m.id)}
                      onChange={() => toggleMatiere(m.id)}
                    />
                    <span className="text-sm">{m.nom}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModaleMatieres(false)}
                  className="px-4 py-2 text-sm rounded border hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded text-sm">
                  Sauver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}