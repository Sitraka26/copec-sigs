import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const LIBELLES_ROLE = {
  ADMIN: 'Administrateurs', DIRECTEUR: 'Direction', SECRETAIRE: 'Secrétariat',
  ECONOME: 'Économat', ENSEIGNANT: 'Tous les enseignants', SURVEILLANT: 'Surveillants',
};

export default function Messages() {
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');
  const peutEnvoyer = utilisateur?.role === 'ADMIN' || utilisateur?.role === 'DIRECTEUR';

  const [messagesRecus, setMessagesRecus] = useState([]);
  const [messagesEnvoyes, setMessagesEnvoyes] = useState([]);
  const [ongletActif, setOngletActif] = useState('recus');
  const [filtre, setFiltre] = useState('tous');
  const [selection, setSelection] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [enseignants, setEnseignants] = useState([]);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [typeCible, setTypeCible] = useState('role');
  const [destinataireId, setDestinataireId] = useState('');
  const [destinataireRole, setDestinataireRole] = useState('ENSEIGNANT');
  const [contenu, setContenu] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function chargerMessagesRecus() {
    const { data } = await api.get('/messages');
    setMessagesRecus(data);
    if (!selection && data.length > 0) {
      setSelection(data[0].id);
    }
  }

  async function chargerMessagesEnvoyes() {
    if (!peutEnvoyer) return;
    const { data } = await api.get('/messages/envoyes');
    setMessagesEnvoyes(data);
  }

  useEffect(() => {
    const promesses = [chargerMessagesRecus()];
    if (peutEnvoyer) {
      promesses.push(chargerMessagesEnvoyes());
      promesses.push(api.get('/enseignants').then(({ data }) => setEnseignants(data)));
    }
    Promise.all(promesses)
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messagesAffiches = ongletActif === 'recus' ? messagesRecus : messagesEnvoyes;

  const messagesFiltres = useMemo(() => {
    if (ongletActif === 'recus') {
      const messages = [...messagesRecus].sort((a, b) => new Date(b.dateEnvoi) - new Date(a.dateEnvoi));
      if (filtre === 'nonlus') return messages.filter((m) => !m.lu);
      return messages;
    }

    const messages = [...messagesEnvoyes].sort((a, b) => new Date(b.dateEnvoi) - new Date(a.dateEnvoi));
    if (filtre === 'lus') return messages.filter((m) => m.nombreLectures > 0);
    return messages;
  }, [filtre, messagesEnvoyes, messagesRecus, ongletActif]);

  const messageSelectionne = messagesFiltres.find((message) => message.id === selection) || messagesFiltres[0] || null;

  useEffect(() => {
    if (messagesFiltres.length > 0 && (!selection || !messagesFiltres.some((m) => m.id === selection))) {
      setSelection(messagesFiltres[0].id);
    }
  }, [messagesFiltres, selection]);

  async function marquerLu(id) {
    try {
      await api.patch(`/messages/${id}/lu`);
      await chargerMessagesRecus();
    } catch (err) {
      setErreur(err.response?.data?.error || 'Erreur');
    }
  }

  function ouvrirModale() {
    setContenu('');
    setTypeCible('role');
    setDestinataireRole('ENSEIGNANT');
    setDestinataireId('');
    setErreur('');
    setModaleOuverte(true);
  }

  async function envoyerMessage(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      const corps = typeCible === 'role'
        ? { contenu, destinataireRole }
        : { contenu, destinataireId };
      await api.post('/messages', corps);
      setModaleOuverte(false);
      await chargerMessagesEnvoyes();
      setOngletActif('envoyes');
    } catch (err) {
      setErreur(err.response?.data?.error || "Erreur lors de l'envoi");
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) return <div className="p-8 text-gray-500">Chargement...</div>;

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Messagerie</p>
            <h1 className="text-xl font-semibold text-slate-900">Messages</h1>
          </div>
          {peutEnvoyer && (
            <button onClick={ouvrirModale} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">
              + Nouveau
            </button>
          )}
        </div>

        <div className="flex min-h-[75vh] flex-col md:flex-row">
          <aside className="w-full border-b border-slate-200 bg-slate-50 md:w-80 md:border-b-0 md:border-r">
            <div className="border-b border-slate-200 p-3">
              <div className="flex gap-2 rounded-xl bg-white p-2 shadow-sm">
                <button
                  onClick={() => setOngletActif('recus')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${ongletActif === 'recus' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Reçus
                </button>
                {peutEnvoyer && (
                  <button
                    onClick={() => setOngletActif('envoyes')}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${ongletActif === 'envoyes' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Envoyés
                  </button>
                )}
              </div>
            </div>

            <div className="p-3">
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setFiltre('tous')}
                  className={`rounded-full border px-2.5 py-1 text-xs ${filtre === 'tous' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  Tous
                </button>
                {ongletActif === 'recus' ? (
                  <button
                    onClick={() => setFiltre('nonlus')}
                    className={`rounded-full border px-2.5 py-1 text-xs ${filtre === 'nonlus' ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    Non lus
                  </button>
                ) : (
                  <button
                    onClick={() => setFiltre('lus')}
                    className={`rounded-full border px-2.5 py-1 text-xs ${filtre === 'lus' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    Lus
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {messagesFiltres.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                    Aucun message dans cette vue.
                  </div>
                ) : (
                  messagesFiltres.map((message) => {
                    const estSelectionne = messageSelectionne?.id === message.id;
                    const titre = ongletActif === 'recus'
                      ? `${message.expediteur.nom} ${message.expediteur.prenom}`
                      : message.cible;

                    return (
                      <button
                        key={message.id}
                        type="button"
                        onClick={() => {
                          setSelection(message.id);
                          if (ongletActif === 'recus' && !message.lu) {
                            marquerLu(message.id);
                          }
                        }}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          estSelectionne ? 'border-slate-900 bg-white shadow-sm' : 'border-transparent bg-white/60 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-800">{titre}</span>
                              {ongletActif === 'recus' && !message.lu && (
                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{message.contenu}</p>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {new Date(message.dateEnvoi).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <section className="flex min-h-[60vh] flex-1 flex-col bg-white">
            {messageSelectionne ? (
              <>
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {ongletActif === 'recus'
                          ? `${messageSelectionne.expediteur.nom} ${messageSelectionne.expediteur.prenom}`
                          : messageSelectionne.cible}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ongletActif === 'recus'
                          ? (messageSelectionne.cibleTout ? 'Message ciblé à tout le poste' : 'Message personnel')
                          : `${messageSelectionne.nombreLectures ?? 0} lecture(s)`}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                      {ongletActif === 'recus' ? 'reçu' : 'envoyé'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4">
                  <div className={`max-w-lg rounded-2xl p-3 shadow-sm ${ongletActif === 'recus' ? 'bg-slate-900 text-white' : 'ml-auto bg-blue-50 text-slate-800'}`}>
                    <p className="whitespace-pre-wrap text-sm leading-6">{messageSelectionne.contenu}</p>
                    <div className={`mt-2 text-[10px] ${ongletActif === 'recus' ? 'text-slate-300' : 'text-slate-500'}`}>
                      {new Date(messageSelectionne.dateEnvoi).toLocaleString('fr-FR')}
                    </div>
                  </div>

                  {ongletActif === 'recus' && !messageSelectionne.lu && (
                    <div className="flex justify-start">
                      <button onClick={() => marquerLu(messageSelectionne.id)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                        Marquer comme lu
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
                Aucune conversation sélectionnée.
              </div>
            )}
          </section>
        </div>
      </div>

      {erreur && <p className="mx-auto mt-4 max-w-6xl text-sm text-red-600">{erreur}</p>}

      {modaleOuverte && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Nouveau message</h2>
              <button type="button" onClick={() => setModaleOuverte(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {erreur && <p className="mb-3 text-sm text-red-600">{erreur}</p>}

            <form onSubmit={envoyerMessage} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Destinataire</label>
                <div className="mb-2 flex gap-3 text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input type="radio" checked={typeCible === 'role'} onChange={() => setTypeCible('role')} />
                    Poste
                  </label>
                  <label className="flex items-center gap-2 text-slate-600">
                    <input type="radio" checked={typeCible === 'personne'} onChange={() => setTypeCible('personne')} />
                    Personne
                  </label>
                </div>

                {typeCible === 'role' ? (
                  <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={destinataireRole} onChange={(e) => setDestinataireRole(e.target.value)}>
                    {Object.entries(LIBELLES_ROLE).map(([valeur, libelle]) => (
                      <option key={valeur} value={valeur}>{libelle}</option>
                    ))}
                  </select>
                ) : (
                  <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={destinataireId} onChange={(e) => setDestinataireId(e.target.value)} required>
                    <option value="">-- Choisir une personne --</option>
                    {enseignants.map((ens) => (
                      <option key={ens.utilisateur.id} value={ens.utilisateur.id}>
                        {ens.utilisateur.nom} {ens.utilisateur.prenom}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-800"
                  value={contenu}
                  onChange={(e) => setContenu(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModaleOuverte(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={envoi} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                  {envoi ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}