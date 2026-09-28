import { useEffect, useState } from 'react';
import api from '../api/client';

const PERIODES = [1, 2, 3, 4, 5];
const NOMS_PERIODES = { 1: '1er Bimestre', 2: '2ème Bimestre', 3: '3ème Bimestre', 4: '4ème Bimestre', 5: '5ème Bimestre' };

export default function Bulletins() {
  const [classes, setClasses] = useState([]);
  const [classeId, setClasseId] = useState('');
  const [periode, setPeriode] = useState(1);

  const [apercu, setApercu] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [generation, setGeneration] = useState(false);
  const [telechargementId, setTelechargementId] = useState(null);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState('moyenne');
  const [selection, setSelection] = useState([]);
  const [detail, setDetail] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => {
        setClasses(data);
        if (data.length > 0) setClasseId(data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  async function chargerApercu() {
    if (!classeId || !periode) return;
    setErreur('');
    try {
      const { data } = await api.get(`/bulletins/classe/${classeId}/periode/${periode}`);
      setApercu(data);
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur de chargement de l'aperçu");
    }
  }

  useEffect(() => {
    chargerApercu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeId, periode]);

  const classeSelectionnee = classes.find((c) => c.id === classeId);
  const resultatsFiltres = (apercu?.resultats || [])
    .filter((r) => `${r.nom} ${r.prenom}`.toLowerCase().includes(recherche.trim().toLowerCase()))
    .sort((a, b) => {
      if (tri === 'nom') return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
      if (tri === 'rang') return (a.rang ?? 9999) - (b.rang ?? 9999);
      return (b.moyenne ?? -1) - (a.moyenne ?? -1);
    });

  function basculerSelection(id) {
    setSelection((courante) => (courante.includes(id) ? courante.filter((item) => item !== id) : [...courante, id]));
  }

  function selectionnerTous() {
    setSelection(selection.length === resultatsFiltres.length ? [] : resultatsFiltres.map((r) => r.eleveId));
  }

  async function ouvrirDetail(eleveId) {
    setChargementDetail(true);
    setErreur('');
    try {
      const { data } = await api.get(`/bulletins/eleve/${eleveId}/periode/${periode}`);
      setDetail(data);
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur de chargement du détail");
    } finally {
      setChargementDetail(false);
    }
  }

  function exporterCSV() {
    const lignes = [['Nom', 'Prénom', 'Moyenne', 'Rang', 'Période']];
    resultatsFiltres.forEach((r) => lignes.push([r.nom, r.prenom, r.moyenne ?? '', r.rang ?? '', NOMS_PERIODES[periode]]));
    const csv = lignes.map((ligne) => ligne.map((cellule) => `"${String(cellule).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `bulletins_${classeSelectionnee?.nom || 'classe'}_${periode}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  const moyenneClasse = resultatsFiltres.length
    ? resultatsFiltres.reduce((total, r) => total + (r.moyenne ?? 0), 0) / resultatsFiltres.filter((r) => r.moyenne !== null).length || 0
    : 0;

  async function genererBulletins() {
    setGeneration(true);
    setErreur('');
    setMessageSucces('');
    try {
      await api.post('/bulletins/generer', {
        classeId,
        anneeScolaireId: classeSelectionnee.anneeScolaireId,
        periode,
      });
      setMessageSucces('Bulletins générés et enregistrés avec succès.');
      await chargerApercu();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la génération');
    } finally {
      setGeneration(false);
    }
  }

  async function telechargerBulletinPdf(eleveId, nomComplet) {
    setTelechargementId(eleveId);
    try {
      const reponse = await api.get(
        `/bulletins/eleve/${eleveId}/annee/${classeSelectionnee.anneeScolaireId}/pdf`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([reponse.data], { type: 'application/pdf' }));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `bulletin_${nomComplet.replace(/\s+/g, '_')}.pdf`;
      lien.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErreur('Erreur lors du téléchargement du bulletin');
    } finally {
      setTelechargementId(null);
    }
  }

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-2">Bulletins</h1>
      <p className="text-gray-500 text-sm mb-6">
        Génère les moyennes et rangs d'une classe pour une période, puis télécharge le bulletin
        PDF individuel de chaque élève (qui reprend automatiquement les 5 bimestres de l'année).
      </p>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm mb-1">Classe</label>
          <select className="border rounded px-3 py-2" value={classeId} onChange={(e) => setClasseId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <input
            className="border rounded px-3 py-2 text-sm min-w-64"
            placeholder="Rechercher un élève..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <select className="border rounded px-3 py-2 text-sm" value={tri} onChange={(e) => setTri(e.target.value)}>
            <option value="moyenne">Trier par moyenne</option>
            <option value="rang">Trier par rang</option>
            <option value="nom">Trier par nom</option>
          </select>
          <button onClick={exporterCSV} disabled={!resultatsFiltres.length} className="border rounded px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            Exporter CSV
          </button>
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

      {apercu && apercu.resultats.length === 0 && (
        <p className="text-gray-500">Aucun élève inscrit dans cette classe.</p>
      )}

      {apercu && apercu.resultats.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white border rounded p-3"><p className="text-xs text-gray-500">Élèves affichés</p><p className="text-lg font-medium">{resultatsFiltres.length}</p></div>
            <div className="bg-white border rounded p-3"><p className="text-xs text-gray-500">Moyenne de classe</p><p className="text-lg font-medium">{moyenneClasse.toFixed(2)}/20</p></div>
            <div className="bg-white border rounded p-3"><p className="text-xs text-gray-500">Meilleure moyenne</p><p className="text-lg font-medium">{Math.max(...resultatsFiltres.map((r) => r.moyenne ?? 0)).toFixed(2)}/20</p></div>
            <div className="bg-white border rounded p-3"><p className="text-xs text-gray-500">Sélectionnés</p><p className="text-lg font-medium">{selection.length}</p></div>
          </div>
          <div className="bg-white rounded border overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-4 py-2"><input type="checkbox" checked={resultatsFiltres.length > 0 && selection.length === resultatsFiltres.length} onChange={selectionnerTous} /></th>
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Prénom</th>
                  <th className="px-4 py-2">Moyenne</th>
                  <th className="px-4 py-2">Rang</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {resultatsFiltres.map((r) => (
                  <tr key={r.eleveId} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2"><input type="checkbox" checked={selection.includes(r.eleveId)} onChange={() => basculerSelection(r.eleveId)} /></td>
                      <td className="px-4 py-2">{r.nom}</td>
                    <td className="px-4 py-2">{r.prenom}</td>
                    <td className="px-4 py-2">{r.moyenne !== null ? r.moyenne.toFixed(2) : '—'}</td>
                    <td className="px-4 py-2">{r.rang ?? '—'}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => ouvrirDetail(r.eleveId)} className="mr-3 text-slate-700 hover:underline text-xs">
                        Détails
                      </button>
                      <button
                        onClick={() => telechargerBulletinPdf(r.eleveId, `${r.nom}_${r.prenom}`)}
                        disabled={telechargementId === r.eleveId}
                        className="text-blue-700 hover:underline text-xs disabled:opacity-50"
                      >
                        {telechargementId === r.eleveId ? 'Génération...' : 'Télécharger le bulletin PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={genererBulletins}
            disabled={generation}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {generation ? 'Génération...' : 'Générer et enregistrer les bulletins de cette période'}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Cet aperçu montre les moyennes calculées en temps réel. Clique sur le bouton ci-dessus pour
            les enregistrer officiellement (nécessaire avant de télécharger un PDF cohérent).
          </p>
        </>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[85vh] overflow-auto">
            <h2 className="text-lg font-medium mb-1">Détail du bulletin</h2>
            <p className="text-sm text-gray-600 mb-4">{detail.eleve.nom} {detail.eleve.prenom} — {NOMS_PERIODES[detail.periode]}</p>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100 text-left"><tr><th className="px-3 py-2">Matière</th><th className="px-3 py-2">Note</th><th className="px-3 py-2">Coefficient</th></tr></thead>
              <tbody>{detail.notes.map((note) => <tr key={note.matiere} className="border-t"><td className="px-3 py-2">{note.matiere}</td><td className="px-3 py-2">{note.valeur}/20</td><td className="px-3 py-2">{note.coefficient}</td></tr>)}</tbody>
            </table>
            <p className="mt-4 text-sm">Moyenne générale : <strong>{detail.moyenneGenerale ?? '—'}</strong> — Rang : <strong>{detail.rang ?? '—'}</strong></p>
            <div className="flex justify-end mt-4"><button onClick={() => setDetail(null)} className="px-4 py-2 border rounded text-sm">Fermer</button></div>
          </div>
        </div>
      )}
    </div>
  );
}