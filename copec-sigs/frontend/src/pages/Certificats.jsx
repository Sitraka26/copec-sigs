import { useEffect, useState } from 'react';
import api from '../api/client';

const TYPES_CERTIFICAT = [
  { value: 'SCOLARITE', label: 'Certificat de scolarité' },
  { value: 'ASSIDUITE', label: "Certificat d'assiduité" },
  { value: 'REUSSITE', label: 'Certificat de réussite' },
];

const LIBELLES_STATUT = {
  EN_ATTENTE: 'En attente',
  APPROUVE: 'Approuvé',
  REJETE: 'Rejeté',
};

const COULEURS_STATUT = {
  EN_ATTENTE: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROUVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJETE: 'bg-red-50 text-red-800 border-red-200',
};

export default function Certificats() {
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');
  const estDirecteur = ['ADMIN', 'DIRECTEUR'].includes(utilisateur?.role);

  const [eleves, setEleves] = useState([]);
  const [eleveId, setEleveId] = useState('');
  const [type, setType] = useState('SCOLARITE');
  const [chargement, setChargement] = useState(true);
  const [generation, setGeneration] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [appreciationDemo, setAppreciationDemo] = useState('');

  const [demandes, setDemandes] = useState([]);
  const [chargementDemandes, setChargementDemandes] = useState(false);
  const [actionId, setActionId] = useState(null);

  function chargerDemandes() {
    setChargementDemandes(true);
    api
      .get('/certificats/demandes')
      .then(({ data }) => setDemandes(data || []))
      .catch(() => {})
      .finally(() => setChargementDemandes(false));
  }

  useEffect(() => {
    api
      .get('/eleves')
      .then(({ data }) => {
        setEleves(data);
        if (data.length > 0) setEleveId(data[0].id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));

    api
      .get('/certificats/appreciation', { params: { moyenne: 14.5, rang: 2, effectif: 30 } })
      .then(({ data }) => setAppreciationDemo(data.appreciation))
      .catch(() => {});

    chargerDemandes();
  }, []);

  async function generer() {
    if (!eleveId) {
      setErreur('Choisissez un élève');
      return;
    }
    setErreur('');
    setSucces('');
    setGeneration(true);
    try {
      const res = await api.post(
        '/certificats/generer',
        { eleveId, type },
        { responseType: 'blob' }
      );

      // Si le serveur renvoie du JSON (demande créée ou erreur)
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const texte = await res.data.text();
        const json = JSON.parse(texte);
        if (json.message) {
          setSucces(json.message);
          chargerDemandes();
        } else {
          setErreur(json.error || 'Réponse inattendue');
        }
        return;
      }

      // PDF
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificat-${type.toLowerCase()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSucces('Certificat téléchargé');
      chargerDemandes();
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const texte = await err.response.data.text();
          const json = JSON.parse(texte);
          setErreur(json.error || 'Erreur serveur');
        } catch {
          setErreur('Erreur lors de la génération');
        }
      } else {
        setErreur(err.response?.data?.error || 'Erreur lors de la génération');
      }
    } finally {
      setGeneration(false);
    }
  }

  async function approuver(id) {
    setActionId(id);
    setErreur('');
    try {
      const res = await api.post(`/certificats/demandes/${id}/approuver`, {}, { responseType: 'blob' });
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('application/pdf')) {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificat-approuve.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        setSucces('Demande approuvée — PDF téléchargé');
      }
      chargerDemandes();
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const texte = await err.response.data.text();
          const json = JSON.parse(texte);
          setErreur(json.error || 'Erreur');
        } catch {
          setErreur('Erreur lors de l\'approbation');
        }
      } else {
        setErreur(err.response?.data?.error || 'Erreur lors de l\'approbation');
      }
    } finally {
      setActionId(null);
    }
  }

  async function rejeter(id) {
    const motif = window.prompt('Motif du rejet (optionnel) :') || 'Rejeté par la direction';
    setActionId(id);
    setErreur('');
    try {
      await api.post(`/certificats/demandes/${id}/rejeter`, { motifRejet: motif });
      setSucces('Demande rejetée');
      chargerDemandes();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors du rejet');
    } finally {
      setActionId(null);
    }
  }

  const demandesEnAttente = demandes.filter((d) => d.statut === 'EN_ATTENTE');

  if (chargement) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Certificats</h1>
        <p className="text-slate-500 text-sm mt-1">
          Génération de certificats officiels — règles de solvabilité, moyenne et validation direction
        </p>
      </div>

      {erreur && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-4">{erreur}</p>
      )}
      {succes && (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mb-4">{succes}</p>
      )}

      {/* Formulaire génération */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Élève</label>
          <select
            value={eleveId}
            onChange={(e) => setEleveId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {eleves.map((e) => (
              <option key={e.id} value={e.id}>
                {e.prenom} {e.nom} ({e.matricule})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de certificat</label>
          <div className="space-y-2">
            {TYPES_CERTIFICAT.map((t) => (
              <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                  className="text-blue-600"
                />
                <span className="text-sm text-slate-700">{t.label}</span>
                {(t.value === 'ASSIDUITE' || t.value === 'REUSSITE') && !estDirecteur && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    validation direction
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={generer}
          disabled={generation || !eleveId}
          className="w-full sm:w-auto px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition"
        >
          {generation
            ? 'Traitement…'
            : type === 'SCOLARITE' || estDirecteur
              ? 'Télécharger le PDF'
              : 'Envoyer la demande'}
        </button>
      </div>

      {/* Demandes en attente — visible surtout pour le Directeur */}
      {estDirecteur && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-medium text-slate-800 text-sm">Demandes en attente</h2>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {demandesEnAttente.length}
            </span>
          </div>

          {chargementDemandes ? (
            <p className="p-6 text-slate-400 text-sm">Chargement…</p>
          ) : demandesEnAttente.length === 0 ? (
            <p className="p-6 text-center text-slate-400 text-sm">Aucune demande en attente.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {demandesEnAttente.map((d) => (
                <li key={d.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm text-slate-800">
                      {d.eleve?.prenom} {d.eleve?.nom}
                      <span className="text-slate-400 font-normal ml-1">({d.eleve?.matricule})</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {TYPES_CERTIFICAT.find((t) => t.value === d.type)?.label || d.type}
                      {' · '}
                      demandé par {d.demandeur?.prenom} {d.demandeur?.nom}
                      {' · '}
                      {new Date(d.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approuver(d.id)}
                      disabled={actionId === d.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => rejeter(d.id)}
                      disabled={actionId === d.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Historique des demandes (tous rôles concernés) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-medium text-slate-800 text-sm">Historique des demandes</h2>
        </div>
        {demandes.length === 0 ? (
          <p className="p-6 text-center text-slate-400 text-sm">Aucune demande pour le moment.</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {demandes.map((d) => (
              <li key={d.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">
                    {d.eleve?.prenom} {d.eleve?.nom}
                  </span>
                  <span className="text-slate-400 ml-1">
                    — {TYPES_CERTIFICAT.find((t) => t.value === d.type)?.label || d.type}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${COULEURS_STATUT[d.statut] || ''}`}>
                  {LIBELLES_STATUT[d.statut] || d.statut}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {appreciationDemo && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Appréciation automatique (exemple)</h2>
          <p className="text-sm text-slate-600 italic">Pour une moyenne de 14,50 et rang 2/30 :</p>
          <p className="mt-2 text-sm text-slate-800 bg-slate-50 rounded-lg p-3 border border-slate-100">
            « {appreciationDemo} »
          </p>
        </div>
      )}
    </div>
  );
}