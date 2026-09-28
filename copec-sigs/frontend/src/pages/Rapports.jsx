import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Rapports() {
  const [annees, setAnnees] = useState([]);
  const [anneeId, setAnneeId] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [telechargementEnCours, setTelechargementEnCours] = useState(null);
  const [synthese, setSynthese] = useState(null);
  const [periode, setPeriode] = useState('1');
  const [chargementSynthese, setChargementSynthese] = useState(false);

  useEffect(() => {
    api
      .get('/annees-scolaires')
      .then(({ data }) => {
        setAnnees(data);
        const active = data.find((a) => a.active) || data[0];
        if (active) setAnneeId(active.id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    if (!anneeId) return;
    setChargementSynthese(true);
    api.get(`/rapports/synthese?anneeScolaireId=${anneeId}`)
      .then(({ data }) => setSynthese(data))
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement de la synthèse'))
      .finally(() => setChargementSynthese(false));
  }, [anneeId]);

  async function telecharger(cle, url, nomFichier) {
    setTelechargementEnCours(cle);
    setErreur('');
    try {
      const reponse = await api.get(url, { responseType: 'blob' });
      const lienUrl = window.URL.createObjectURL(
        new Blob([reponse.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      );
      const lien = document.createElement('a');
      lien.href = lienUrl;
      lien.download = nomFichier;
      lien.click();
      window.URL.revokeObjectURL(lienUrl);
    } catch (err) {
      setErreur('Erreur lors du téléchargement du rapport');
    } finally {
      setTelechargementEnCours(null);
    }

  }

  function formaterMontant(montant) {
    return `${new Intl.NumberFormat('fr-FR').format(montant || 0)} Ar`;
  }

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-2">Rapports</h1>
      <p className="text-gray-500 text-sm mb-6">Suivi synthétique de l'établissement et exports prêts à imprimer ou archiver.</p>

      {erreur && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

      <div className="bg-white border rounded-lg p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-medium">Synthèse de l'année</h2>
            <p className="text-xs text-gray-500">Indicateurs actualisés selon l'année scolaire sélectionnée.</p>
          </div>
          <select
            className="border rounded px-2 py-1.5 text-sm"
            value={anneeId}
            onChange={(e) => setAnneeId(e.target.value)}
          >
            {annees.map((a) => <option key={a.id} value={a.id}>{a.libelle}</option>)}
          </select>
        </div>
        {chargementSynthese ? <p className="text-sm text-gray-500">Calcul de la synthèse...</p> : synthese && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded p-3"><p className="text-xs text-gray-500">Élèves inscrits</p><p className="text-xl font-semibold">{synthese.eleves}</p></div>
              <div className="bg-slate-50 rounded p-3"><p className="text-xs text-gray-500">Classes actives</p><p className="text-xl font-semibold">{synthese.classes}</p></div>
              <div className="bg-slate-50 rounded p-3"><p className="text-xs text-gray-500">Absences</p><p className="text-xl font-semibold">{synthese.scolarite.absences}</p></div>
              <div className="bg-slate-50 rounded p-3"><p className="text-xs text-gray-500">Moyenne des notes</p><p className="text-xl font-semibold">{synthese.scolarite.moyenne ?? '—'}/20</p></div>
            </div>
            {synthese.paiements && (
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
                <span>Recettes enregistrées : <strong>{formaterMontant(synthese.paiements.total)}</strong></span>
                <span>Droits : <strong>{formaterMontant(synthese.paiements.droit)}</strong></span>
                <span>Écolage : <strong>{formaterMontant(synthese.paiements.ecolage)}</strong></span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <div className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-1">Liste des élèves</h2>
          <p className="text-xs text-gray-500 mb-4">Tous les élèves inscrits, avec leur classe actuelle.</p>
          <button
            onClick={() => telecharger('eleves', '/rapports/eleves', 'eleves.xlsx')}
            disabled={telechargementEnCours === 'eleves'}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {telechargementEnCours === 'eleves' ? 'Génération...' : 'Télécharger (Excel)'}
          </button>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-1">Absences et retards</h2>
          <p className="text-xs text-gray-500 mb-4">Élève, classe, date, statut, justification et contact d'urgence.</p>
          <button
            onClick={() => telecharger('absences', `/rapports/absences?anneeScolaireId=${anneeId}`, 'absences.xlsx')}
            disabled={telechargementEnCours === 'absences' || !anneeId}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {telechargementEnCours === 'absences' ? 'Génération...' : 'Télécharger (Excel)'}
          </button>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-1">Résultats scolaires</h2>
          <p className="text-xs text-gray-500 mb-3">Moyenne et nombre de notes par élève pour un bimestre.</p>
          <div className="flex gap-2 mb-3">
            <select className="border rounded px-2 py-1.5 text-sm" value={periode} onChange={(e) => setPeriode(e.target.value)}>
              {[1, 2, 3, 4, 5].map((numero) => <option key={numero} value={numero}>Bimestre {numero}</option>)}
            </select>
          </div>
          <button
            onClick={() => telecharger('resultats', `/rapports/resultats?anneeScolaireId=${anneeId}&periode=${periode}`, `resultats-bimestre-${periode}.xlsx`)}
            disabled={telechargementEnCours === 'resultats' || !anneeId}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {telechargementEnCours === 'resultats' ? 'Génération...' : 'Télécharger (Excel)'}
          </button>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <h2 className="font-medium mb-1">Historique des paiements</h2>
          <p className="text-xs text-gray-500 mb-3">Pour l'année scolaire sélectionnée.</p>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm mb-3"
            value={anneeId}
            onChange={(e) => setAnneeId(e.target.value)}
          >
            {annees.map((a) => (
              <option key={a.id} value={a.id}>{a.libelle}</option>
            ))}
          </select>
          <button
            onClick={() => telecharger('paiements', `/rapports/paiements?anneeScolaireId=${anneeId}`, 'paiements.xlsx')}
            disabled={telechargementEnCours === 'paiements'}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {telechargementEnCours === 'paiements' ? 'Génération...' : 'Télécharger (Excel)'}
          </button>
        </div>
      </div>
    </div>
  );
}