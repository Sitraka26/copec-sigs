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
  const [reclamations, setReclamations] = useState([]);
  const [reclamationOuverte, setReclamationOuverte] = useState(null);
  const [motifReclamation, setMotifReclamation] = useState('');
  const [filtreReclamations, setFiltreReclamations] = useState('TOUTES');
  const role = JSON.parse(localStorage.getItem('utilisateur') || 'null')?.role;
  const peutTraiter = ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'].includes(role);

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

  async function chargerReclamations() {
    try {
      const { data } = await api.get('/notes/reclamations');
      setReclamations(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement des réclamations');
    }
  }

  useEffect(() => {
    chargerReclamations();
  }, []);

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

  async function soumettreReclamation(e) {
    e.preventDefault();
    if (!reclamationOuverte || !motifReclamation.trim()) return;
    try {
      await api.post('/notes/reclamations', {
        eleveId: reclamationOuverte.eleveId,
        matiereId,
        periode,
        motif: motifReclamation,
      });
      setReclamationOuverte(null);
      setMotifReclamation('');
      setMessageSucces('Réclamation envoyée.');
      await chargerReclamations();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'envoi de la réclamation");
    }
  }

  async function traiterReclamation(reclamation, statut) {
    const reponse = window.prompt('Réponse (optionnelle) :', reclamation.reponse || '');
    if (reponse === null) return;
    try {
      await api.patch(`/notes/reclamations/${reclamation.id}`, { statut, reponse });
      await chargerReclamations();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de traitement');
    }
  }

  function exporterReclamations() {
    const lignes = [['Élève', 'Matière', 'Bimestre', 'Motif', 'Statut', 'Date']];
    reclamations.forEach((r) => lignes.push([
      `${r.eleve.nom} ${r.eleve.prenom}`,
      r.matiere.nom,
      NOMS_PERIODES[r.periode],
      r.motif,
      r.statut,
      new Date(r.createdAt).toLocaleDateString('fr-FR'),
    ]));
    const csv = lignes.map((ligne) => ligne.map((cellule) => `"${String(cellule).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'reclamations-notes.csv';
    lien.click();
    URL.revokeObjectURL(url);
  }

  const reclamationsFiltrees = reclamations.filter((r) => filtreReclamations === 'TOUTES' || r.statut === filtreReclamations);

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
                      <button
                        type="button"
                        onClick={() => setReclamationOuverte(eleve)}
                        className="ml-2 text-xs text-orange-700 hover:underline"
                      >
                        Réclamer
                      </button>
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

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Réclamations de notes</h2>
          <div className="flex gap-2">
            <select className="border rounded px-2 py-1 text-sm" value={filtreReclamations} onChange={(e) => setFiltreReclamations(e.target.value)}>
              <option value="TOUTES">Toutes</option>
              <option value="OUVERTE">Ouvertes</option>
              <option value="EN_COURS">En cours</option>
              <option value="TRAITEE">Traitées</option>
              <option value="REJETEE">Rejetées</option>
            </select>
            <button onClick={exporterReclamations} className="border rounded px-3 py-1 text-sm hover:bg-gray-50">Exporter</button>
          </div>
        </div>
        {reclamationsFiltrees.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune réclamation.</p>
        ) : (
          <div className="bg-white rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left"><tr><th className="px-3 py-2">Élève</th><th className="px-3 py-2">Matière</th><th className="px-3 py-2">Motif</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Action</th></tr></thead>
              <tbody>
                {reclamationsFiltrees.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.eleve.nom} {r.eleve.prenom}</td>
                    <td className="px-3 py-2">{r.matiere.nom} — {NOMS_PERIODES[r.periode]}</td>
                    <td className="px-3 py-2">{r.motif}</td>
                    <td className="px-3 py-2">{r.statut}</td>
                    <td className="px-3 py-2">
                      {peutTraiter && r.statut !== 'TRAITEE' && r.statut !== 'REJETEE' && (
                        <div className="flex gap-2">
                          <button onClick={() => traiterReclamation(r, 'EN_COURS')} className="text-blue-700 text-xs hover:underline">En cours</button>
                          <button onClick={() => traiterReclamation(r, 'TRAITEE')} className="text-green-700 text-xs hover:underline">Traiter</button>
                          <button onClick={() => traiterReclamation(r, 'REJETEE')} className="text-red-700 text-xs hover:underline">Rejeter</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {reclamationOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={soumettreReclamation} className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-2">Réclamer une note</h2>
            <p className="text-sm text-gray-600 mb-3">{reclamationOuverte.nom} {reclamationOuverte.prenom} — {grille?.matiere?.nom}, {NOMS_PERIODES[periode]}</p>
            <textarea className="w-full border rounded px-3 py-2 min-h-24" placeholder="Expliquez la réclamation..." value={motifReclamation} onChange={(e) => setMotifReclamation(e.target.value)} required />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setReclamationOuverte(null)} className="px-3 py-2 border rounded text-sm">Annuler</button>
              <button type="submit" className="px-3 py-2 bg-slate-800 text-white rounded text-sm">Envoyer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}