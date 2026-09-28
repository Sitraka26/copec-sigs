import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [anneeScolaireId, setAnneeScolaireId] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);

  const [formulaire, setFormulaire] = useState({ nom: '', niveauId: '', enseignantPrincipal: '' });
  const [enseignants, setEnseignants] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [editingId, setEditingId] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsData, setDetailsData] = useState(null);

  async function chargerClasses() {
    try {
      const { data } = await api.get('/classes');
      setClasses(data);
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur de chargement');
    }
  }

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/niveaux'), api.get('/annees-scolaires'), api.get('/enseignants')])
      .then(([resClasses, resNiveaux, resAnnees, resEns]) => {
        setClasses(resClasses.data);
        setNiveaux(resNiveaux.data);
        setEnseignants(resEns.data || []);
        const anneeActive = resAnnees.data.find((a) => a.active) || resAnnees.data[0];
        if (anneeActive) setAnneeScolaireId(anneeActive.id);
        else setErreur("Aucune année scolaire n'existe encore — contacte l'administrateur système.");
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  function ouvrirModale() {
    setFormulaire({ nom: '', niveauId: niveaux[0]?.id || '', enseignantPrincipal: '' });
    setErreur('');
    setModaleOuverte(true);
  }

  function majChamp(champ, valeur) {
    setFormulaire((f) => ({ ...f, [champ]: valeur }));
  }

  function ouvrirModaleEdit(classe) {
    setEditingId(classe.id);
    setFormulaire({ nom: classe.nom || '', niveauId: classe.niveauId || niveaux[0]?.id || '', enseignantPrincipal: classe.enseignantPrincipal || '' });
    setErreur('');
    setModaleOuverte(true);
  }

  async function supprimerClasse(id) {
    if (!confirm('Confirmer la suppression de cette classe ?')) return;
    try {
      await api.delete(`/classes/${id}`);
      await chargerClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  async function dupliquerClasse(classe) {
    try {
      const copie = { nom: `${classe.nom} (copie)`, niveauId: classe.niveauId, anneeScolaireId };
      await api.post('/classes', copie);
      await chargerClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la duplication');
    }
  }

  async function voirClasse(id) {
    try {
      const { data } = await api.get(`/classes/${id}`);
      setDetailsData(data);
      setDetailsModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors du chargement de la classe');
    }
  }

  async function exportRoster(id) {
    try {
      const { data } = await api.get(`/classes/${id}`);
      const list = data.inscriptions || [];
      const header = ['matricule','nom','prenom'];
      const rows = list.map((r) => [r.eleve.matricule, r.eleve.nom, r.eleve.prenom]);
      const csv = [header.join(';'), ...rows.map((r) => r.map((c) => `"${(c||'').toString().replace(/"/g,'""')}"`).join(';'))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${data.nom || 'classe'}-roster.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur export');
    }
  }

  async function soumettre(e) {
    e.preventDefault();
    if (!anneeScolaireId) {
      setErreur("Aucune année scolaire disponible, impossible de créer une classe.");
      return;
    }
    setEnregistrement(true);
    setErreur('');
    try {
      if (editingId) {
        await api.put(`/classes/${editingId}`, { nom: formulaire.nom, niveauId: formulaire.niveauId, enseignantPrincipal: formulaire.enseignantPrincipal });
      } else {
        await api.post('/classes', { ...formulaire, anneeScolaireId });
      }
      setModaleOuverte(false);
      setEditingId(null);
      await chargerClasses();
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  // Memoized filtered and pagination — hooks must be called unconditionally
  const filteredClasses = useMemo(() => {
    const q = (recherche || '').trim().toLowerCase();
    if (!q) return classes || [];
    return (classes || []).filter((c) => {
      return (c.nom || '').toLowerCase().includes(q) || (c.niveau?.libelle || '').toLowerCase().includes(q);
    });
  }, [classes, recherche]);

  const totalPages = Math.max(1, Math.ceil((filteredClasses || []).length / perPage));
  const displayed = (filteredClasses || []).slice((page - 1) * perPage, page * perPage);

  // Export filtered classes roster (if id == null) or single class roster
  async function exportRoster(id) {
    try {
      if (!id) {
        const listAll = filteredClasses.flatMap((c) => c._inscriptions || []);
        // if _inscriptions not prefetched, fetch each class
        if (listAll.length === 0) {
          // fallback: fetch each class details sequentially (lightweight)
          const rows = [];
          for (const c of filteredClasses) {
            const { data } = await api.get(`/classes/${c.id}`);
            (data.inscriptions || []).forEach((r) => rows.push([r.eleve.matricule, r.eleve.nom, r.eleve.prenom]));
          }
          const header = ['matricule','nom','prenom'];
          const csv = [header.join(';'), ...rows.map((r) => r.map((c) => `"${(c||'').toString().replace(/"/g,'""')}"`).join(';'))].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `classes-roster.csv`; a.click(); URL.revokeObjectURL(url);
          return;
        }
        const header = ['matricule','nom','prenom'];
        const csv = [header.join(';'), ...listAll.map((r) => [r.eleve.matricule, r.eleve.nom, r.eleve.prenom].map((c) => `"${(c||'').toString().replace(/"/g,'""')}"`).join(';'))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `classes-roster.csv`; a.click(); URL.revokeObjectURL(url);
        return;
      }
      const { data } = await api.get(`/classes/${id}`);
      const list = data.inscriptions || [];
      const header = ['matricule','nom','prenom'];
      const rows = list.map((r) => [r.eleve.matricule, r.eleve.nom, r.eleve.prenom]);
      const csv = [header.join(';'), ...rows.map((r) => r.map((c) => `"${(c||'').toString().replace(/"/g,'""')}"`).join(';'))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${data.nom || 'classe'}-roster.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur export');
    }
  }

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium">Classes</h1>
        <div className="flex gap-2">
          <input value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(1); }} placeholder="Rechercher par nom/niveau" className="border rounded px-3 py-2" />
          <button onClick={() => exportRoster(null)} className="px-3 py-2 border rounded text-sm" title="Exporter effectif de toutes les classes filtrées">Exporter CSV (filtré)</button>
          <button
            onClick={ouvrirModale}
            disabled={niveaux.length === 0 || !anneeScolaireId}
            className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            + Créer une classe
          </button>
        </div>
      </div>

      {erreur && !modaleOuverte && <p className="text-red-600 text-sm mb-4">{erreur}</p>}

      {(!classes || classes.length) === 0 ? (
        <p className="text-gray-500">Aucune classe créée pour l'instant.</p>
      ) : (
        <div className="bg-white rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Niveau</th>
                <th className="px-4 py-2">Cycle</th>
                <th className="px-4 py-2">Effectif</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((classe) => (
                <tr key={classe.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{classe.nom}</td>
                  <td className="px-4 py-2">{classe.niveau.libelle}{classe.niveau.filiere ? ` - ${classe.niveau.filiere}` : ''}</td>
                  <td className="px-4 py-2">{classe.niveau.cycle}</td>
                  <td className="px-4 py-2">{classe._count?.inscriptions ?? 0}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => voirClasse(classe.id)} className="px-2 py-1 text-sm border rounded">Voir</button>
                      <button onClick={() => ouvrirModaleEdit(classe)} className="px-2 py-1 text-sm border rounded">Modifier</button>
                      <button onClick={() => dupliquerClasse(classe)} className="px-2 py-1 text-sm border rounded">Dupliquer</button>
                      <button onClick={() => exportRoster(classe.id)} className="px-2 py-1 text-sm border rounded">Exporter</button>
                      <button onClick={() => supprimerClasse(classe.id)} className="px-2 py-1 text-sm border rounded text-red-600">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modaleOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium mb-4">{editingId ? 'Modifier une classe' : 'Créer une classe'}</h2>
            {erreur && <p className="text-red-600 text-sm mb-3">{erreur}</p>}
            <form onSubmit={soumettre} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Niveau</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formulaire.niveauId}
                  onChange={(e) => majChamp('niveauId', e.target.value)}
                  required
                >
                  {niveaux.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.libelle}{n.filiere ? ` - ${n.filiere}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Nom de la classe</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="ex: 6ème A"
                  value={formulaire.nom}
                  onChange={(e) => majChamp('nom', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Enseignant principal (optionnel)</label>
                {enseignants.length > 0 ? (
                  <select className="w-full border rounded px-3 py-2" value={formulaire.enseignantPrincipal} onChange={(e) => majChamp('enseignantPrincipal', e.target.value)}>
                    <option value="">-- Aucun --</option>
                    {enseignants.map((ens) => (
                      <option key={ens.id} value={`${ens.utilisateur.nom} ${ens.utilisateur.prenom}`}>
                        {ens.utilisateur.nom} {ens.utilisateur.prenom}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="w-full border rounded px-3 py-2" value={formulaire.enseignantPrincipal} onChange={(e) => majChamp('enseignantPrincipal', e.target.value)} />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setModaleOuverte(false); setEditingId(null); }} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enregistrement}
                  className="px-4 py-2 text-sm rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {enregistrement ? (editingId ? 'Enregistrement...' : 'Création...') : (editingId ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailsModalOpen && detailsData && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-xl">
          <h2 className="text-lg font-medium mb-3">Détails : {detailsData.nom}</h2>
          <p className="text-sm text-gray-600 mb-3">Niveau : {detailsData.niveau.libelle} {detailsData.niveau.filiere ? ` - ${detailsData.niveau.filiere}` : ''}</p>
          <h3 className="font-medium mb-2">Effectif ({detailsData.inscriptions.length})</h3>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left"><tr><th className="px-3 py-2">Matricule</th><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Prénom</th></tr></thead>
              <tbody>
                {detailsData.inscriptions.map((i) => (
                  <tr key={i.id} className="border-t"><td className="px-3 py-2">{i.eleve.matricule}</td><td className="px-3 py-2">{i.eleve.nom}</td><td className="px-3 py-2">{i.eleve.prenom}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setDetailsModalOpen(false); setDetailsData(null); }} className="px-3 py-2 border rounded">Fermer</button>
            <button onClick={() => { exportRoster(detailsData.id); }} className="px-3 py-2 border rounded">Exporter</button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}