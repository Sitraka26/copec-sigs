import { useEffect, useState } from 'react';
import api from '../api/client';

const VIDE = { droit: '', adidy: '', ecolage: '', fraisExamen: '' };

export default function Parametres() {
  const [annees, setAnnees] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  const [anneeSelectionneeId, setAnneeSelectionneeId] = useState('');
  const [valeursBareme, setValeursBareme] = useState({});
  const [enregistrementBareme, setEnregistrementBareme] = useState(false);

  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [formulaireAnnee, setFormulaireAnnee] = useState({
    libelle: '',
    dateDebut: '',
    dateFin: '',
    copierBaremeDepuisAnneeId: '',
    activerMaintenant: false,
  });
  const [creationAnnee, setCreationAnnee] = useState(false);

  async function chargerAnnees() {
    const { data } = await api.get('/annees-scolaires');
    setAnnees(data);
    return data;
  }

  useEffect(() => {
    Promise.all([chargerAnnees(), api.get('/niveaux')])
      .then(([anneesData, resNiveaux]) => {
        setNiveaux(resNiveaux.data);
        const active = anneesData.find((a) => a.active) || anneesData[0];
        if (active) setAnneeSelectionneeId(active.id);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  async function chargerBareme(anneeId) {
    if (!anneeId) return;
    try {
      const { data } = await api.get('/baremes', {
        params: { anneeScolaireId: anneeId },
      });
      const valeurs = {};
      data.forEach((b) => {
        valeurs[b.niveauId] = {
          droit: b.droit ?? 0,
          adidy: b.adidy ?? 0,
          ecolage: b.ecolage ?? 0,
          fraisExamen: b.fraisExamen ?? 0,
        };
      });
      // Niveaux sans ligne barème → champs vides / 0
      setValeursBareme(valeurs);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement du barème');
    }
  }

  useEffect(() => {
    chargerBareme(anneeSelectionneeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anneeSelectionneeId]);

  async function activerAnnee(id) {
    setErreur('');
    setMessageSucces('');
    try {
      await api.patch(`/annees-scolaires/${id}/activer`);
      await chargerAnnees();
      setMessageSucces('Année scolaire activée.');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'activation");
    }
  }

  function ouvrirModaleAnnee() {
    setFormulaireAnnee({
      libelle: '',
      dateDebut: '',
      dateFin: '',
      copierBaremeDepuisAnneeId: annees[0]?.id || '',
      activerMaintenant: false,
    });
    setErreur('');
    setModaleOuverte(true);
  }

  async function creerAnnee(e) {
    e.preventDefault();
    setCreationAnnee(true);
    setErreur('');
    try {
      await api.post('/annees-scolaires', formulaireAnnee);
      setModaleOuverte(false);
      await chargerAnnees();
      setMessageSucces('Nouvelle année scolaire créée.');
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setCreationAnnee(false);
    }
  }

  function majValeurBareme(niveauId, champ, valeur) {
    setValeursBareme((v) => ({
      ...v,
      [niveauId]: {
        ...(v[niveauId] || { ...VIDE }),
        [champ]: valeur,
      },
    }));
  }

  function totalLigne(v) {
    return (
      (parseFloat(v.droit) || 0) +
      (parseFloat(v.adidy) || 0) +
      (parseFloat(v.ecolage) || 0) +
      (parseFloat(v.fraisExamen) || 0)
    );
  }

  async function enregistrerBareme() {
    setEnregistrementBareme(true);
    setErreur('');
    setMessageSucces('');
    try {
      // Une ligne par niveau affiché
      const baremes = niveaux.map((n) => {
        const v = valeursBareme[n.id] || VIDE;
        return {
          niveauId: n.id,
          droit: parseFloat(v.droit) || 0,
          adidy: parseFloat(v.adidy) || 0,
          ecolage: parseFloat(v.ecolage) || 0,
          fraisExamen: parseFloat(v.fraisExamen) || 0,
        };
      });
      await api.put('/baremes', {
        anneeScolaireId: anneeSelectionneeId,
        baremes,
      });
      await chargerBareme(anneeSelectionneeId);
      setMessageSucces('Barème mis à jour (aligné document COPEC).');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrementBareme(false);
    }
  }

  /** Préremplit selon le libellé du niveau (document 2026-2027) */
  function appliquerTarifsCopec() {
    if (
      !window.confirm(
        'Remplir les montants selon le document COPEC Isaha 2026-2027 pour tous les niveaux reconnus ?'
      )
    ) {
      return;
    }
    const tarifs = {
      // clés = morceaux du libellé en minuscules
      'ps-ms': { droit: 50000, adidy: 8000, ecolage: 25000, fraisExamen: 0 },
      'ps / ms': { droit: 50000, adidy: 8000, ecolage: 25000, fraisExamen: 0 },
      ps: { droit: 50000, adidy: 8000, ecolage: 25000, fraisExamen: 0 },
      ms: { droit: 50000, adidy: 8000, ecolage: 25000, fraisExamen: 0 },
      gs: { droit: 50000, adidy: 8000, ecolage: 26000, fraisExamen: 0 },
      'cp1-cp2': { droit: 50000, adidy: 8000, ecolage: 27000, fraisExamen: 0 },
      cp: { droit: 50000, adidy: 8000, ecolage: 27000, fraisExamen: 0 },
      'ce-cm1': { droit: 50000, adidy: 15000, ecolage: 25000, fraisExamen: 0 },
      ce1: { droit: 50000, adidy: 15000, ecolage: 25000, fraisExamen: 0 },
      ce2: { droit: 50000, adidy: 15000, ecolage: 25000, fraisExamen: 0 },
      cm1: { droit: 50000, adidy: 15000, ecolage: 25000, fraisExamen: 0 },
      cm2: { droit: 50000, adidy: 15000, ecolage: 26000, fraisExamen: 0 },
      '6': { droit: 55000, adidy: 15000, ecolage: 27000, fraisExamen: 0 },
      '5': { droit: 55000, adidy: 15000, ecolage: 28000, fraisExamen: 0 },
      '4': { droit: 55000, adidy: 15000, ecolage: 29000, fraisExamen: 0 },
      '3': { droit: 55000, adidy: 15000, ecolage: 30000, fraisExamen: 20000 },
      '2nd': { droit: 55000, adidy: 15000, ecolage: 30000, fraisExamen: 0 },
      seconde: { droit: 55000, adidy: 15000, ecolage: 30000, fraisExamen: 0 },
      '1ère': { droit: 55000, adidy: 15000, ecolage: 33000, fraisExamen: 0 },
      '1ere': { droit: 55000, adidy: 15000, ecolage: 33000, fraisExamen: 0 },
      tle: { droit: 55000, adidy: 15000, ecolage: 33000, fraisExamen: 20000 },
      terminale: { droit: 55000, adidy: 15000, ecolage: 33000, fraisExamen: 20000 },
    };

    const nouvelles = { ...valeursBareme };
    niveaux.forEach((n) => {
      const lib = (n.libelle || '').toLowerCase().replace(/\s+/g, ' ').trim();
      let trouve = null;
      for (const [cle, montant] of Object.entries(tarifs)) {
        if (lib.includes(cle) || lib.startsWith(cle)) {
          trouve = montant;
          break;
        }
      }
      // 6ème, 5ème…
      if (!trouve && /6\s*e|6ème|6eme/.test(lib)) trouve = tarifs['6'];
      if (!trouve && /5\s*e|5ème|5eme/.test(lib)) trouve = tarifs['5'];
      if (!trouve && /4\s*e|4ème|4eme/.test(lib)) trouve = tarifs['4'];
      if (!trouve && /3\s*e|3ème|3eme/.test(lib)) trouve = tarifs['3'];

      if (trouve) {
        nouvelles[n.id] = { ...trouve };
      }
    });
    setValeursBareme(nouvelles);
    setMessageSucces(
      'Montants préremplis selon le document. Cliquez sur « Enregistrer le barème » pour sauver.'
    );
  }

  if (chargement) {
    return <div className="p-8 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-medium mb-2">Paramètres</h1>
      <p className="text-sm text-slate-500 mb-6">
        Barème aligné sur le document COPEC Isaha (Droit, Frais généraux, Écolage, Feuille
        de copie).
      </p>

      {erreur && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-4">
          {erreur}
        </p>
      )}
      {messageSucces && (
        <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mb-4">
          {messageSucces}
        </p>
      )}

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-medium">Années scolaires</h2>
        <button
          onClick={ouvrirModaleAnnee}
          className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-700"
        >
          + Nouvelle année
        </button>
      </div>
      <div className="bg-white rounded border overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Libellé</th>
              <th className="px-4 py-2">Début</th>
              <th className="px-4 py-2">Fin</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {annees.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{a.libelle}</td>
                <td className="px-4 py-2">
                  {new Date(a.dateDebut).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-2">
                  {new Date(a.dateFin).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-2">
                  {a.active ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {!a.active && (
                    <button
                      onClick={() => activerAnnee(a.id)}
                      className="text-blue-700 hover:underline text-xs"
                    >
                      Activer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
        <h2 className="font-medium">Barème de frais (Ariary)</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="border rounded px-3 py-1.5 text-sm"
            value={anneeSelectionneeId}
            onChange={(e) => setAnneeSelectionneeId(e.target.value)}
          >
            {annees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={appliquerTarifsCopec}
            className="border border-blue-300 text-blue-800 px-3 py-1.5 rounded text-sm hover:bg-blue-50"
          >
            Préremplir COPEC 2026-2027
          </button>
        </div>
      </div>

      <div className="bg-white rounded border overflow-x-auto mb-4">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Niveau</th>
              <th className="px-3 py-2 w-28">Droit</th>
              <th className="px-3 py-2 w-28">Frais généraux</th>
              <th className="px-3 py-2 w-28">Écolage</th>
              <th className="px-3 py-2 w-28">Feuille de copie</th>
              <th className="px-3 py-2 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {niveaux.map((n) => {
              const v = valeursBareme[n.id] || VIDE;
              const total = totalLigne(v);
              return (
                <tr key={n.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    {n.libelle}
                    {n.filiere ? ` — ${n.filiere}` : ''}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      className="w-24 border rounded px-2 py-1"
                      value={v.droit}
                      onChange={(e) => majValeurBareme(n.id, 'droit', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      className="w-24 border rounded px-2 py-1"
                      value={v.adidy}
                      onChange={(e) => majValeurBareme(n.id, 'adidy', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      className="w-24 border rounded px-2 py-1"
                      value={v.ecolage}
                      onChange={(e) => majValeurBareme(n.id, 'ecolage', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      className="w-24 border rounded px-2 py-1"
                      value={v.fraisExamen}
                      onChange={(e) =>
                        majValeurBareme(n.id, 'fraisExamen', e.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold tabular-nums text-slate-800">
                    {total.toLocaleString('fr-FR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 mb-3 max-w-2xl">
        <strong>Frais généraux</strong> = champ technique <code>adidy</code> ·{' '}
        <strong>Feuille de copie</strong> = champ <code>fraisExamen</code> (ex. 20 000 Ar en
        3ᵉ et Tle).
      </p>

      <button
        onClick={enregistrerBareme}
        disabled={enregistrementBareme}
        className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
      >
        {enregistrementBareme ? 'Enregistrement...' : 'Enregistrer le barème'}
      </button>

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium mb-4">Nouvelle année scolaire</h2>
            {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
            <form onSubmit={creerAnnee} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Libellé</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="ex: 2026-2027"
                  value={formulaireAnnee.libelle}
                  onChange={(e) =>
                    setFormulaireAnnee((f) => ({ ...f, libelle: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Début</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={formulaireAnnee.dateDebut}
                    onChange={(e) =>
                      setFormulaireAnnee((f) => ({ ...f, dateDebut: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Fin</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={formulaireAnnee.dateFin}
                    onChange={(e) =>
                      setFormulaireAnnee((f) => ({ ...f, dateFin: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Copier le barème depuis</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formulaireAnnee.copierBaremeDepuisAnneeId}
                  onChange={(e) =>
                    setFormulaireAnnee((f) => ({
                      ...f,
                      copierBaremeDepuisAnneeId: e.target.value,
                    }))
                  }
                >
                  <option value="">Ne pas copier</option>
                  {annees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.libelle}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formulaireAnnee.activerMaintenant}
                  onChange={(e) =>
                    setFormulaireAnnee((f) => ({
                      ...f,
                      activerMaintenant: e.target.checked,
                    }))
                  }
                />
                Activer cette année immédiatement
              </label>
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
                  disabled={creationAnnee}
                  className="px-4 py-2 text-sm rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {creationAnnee ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}