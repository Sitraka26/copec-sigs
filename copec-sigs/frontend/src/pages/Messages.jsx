import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const LIBELLES_ROLE = {
  ADMIN: 'Administrateurs',
  DIRECTEUR: 'Direction',
  SECRETAIRE: 'Secrétariat',
  ECONOME: 'Économat',
  ENSEIGNANT: 'Tous les enseignants',
  SURVEILLANT: 'Surveillants',
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

  const messagesFiltres = useMemo(() => {
    if (ongletActif === 'recus') {
      const messages = [...messagesRecus].sort(
        (a, b) => new Date(b.dateEnvoi) - new Date(a.dateEnvoi)
      );
      if (filtre === 'nonlus') return messages.filter((m) => !m.lu);
      return messages;
    }
    const messages = [...messagesEnvoyes].sort(
      (a, b) => new Date(b.dateEnvoi) - new Date(a.dateEnvoi)
    );
    if (filtre === 'lus') return messages.filter((m) => m.nombreLectures > 0);
    return messages;
  }, [filtre, messagesEnvoyes, messagesRecus, ongletActif]);

  const messageSelectionne =
    messagesFiltres.find((m) => m.id === selection) || messagesFiltres[0] || null;

  useEffect(() => {
    if (
      messagesFiltres.length > 0 &&
      (!selection || !messagesFiltres.some((m) => m.id === selection))
    ) {
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
      const corps =
        typeCible === 'role' ? { contenu, destinataireRole } : { contenu, destinataireId };
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

  if (chargement) {
    return (
      <div className="p-8 min-h-full flex justify-center items-center">
        <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 min-h-full">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-1">
            Communication
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messages</h1>
          <p className="text-sm text-slate-500 mt-1">Messagerie interne de l’établissement</p>
        </div>
        {peutEnvoyer && (
          <button
            onClick={ouvrirModale}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-700/20 transition"
          >
            + Nouveau
          </button>
        )}
      </div>

      {erreur && !modaleOuverte && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
          {erreur}
        </p>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex min-h-[70vh] flex-col md:flex-row">
          {/* Liste */}
          <aside className="w-full border-b border-slate-100 bg-slate-50/80 md:w-80 md:border-b-0 md:border-r">
            <div className="border-b border-slate-100 p-3">
              <div className="flex gap-1 rounded-xl bg-white p-1.5 shadow-sm border border-slate-100">
                <button
                  onClick={() => {
                    setOngletActif('recus');
                    setFiltre('tous');
                  }}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    ongletActif === 'recus'
                      ? 'bg-blue-700 text-white shadow'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Reçus
                </button>
                {peutEnvoyer && (
                  <button
                    onClick={() => {
                      setOngletActif('envoyes');
                      setFiltre('tous');
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      ongletActif === 'envoyes'
                        ? 'bg-blue-700 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
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
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    filtre === 'tous'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Tous
                </button>
                {ongletActif === 'recus' ? (
                  <button
                    onClick={() => setFiltre('nonlus')}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      filtre === 'nonlus'
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Non lus
                  </button>
                ) : (
                  <button
                    onClick={() => setFiltre('lus')}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      filtre === 'lus'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Lus
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                {messagesFiltres.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400 text-center">
                    Aucun message dans cette vue.
                  </div>
                ) : (
                  messagesFiltres.map((message) => {
                    const estSelectionne = messageSelectionne?.id === message.id;
                    const titre =
                      ongletActif === 'recus'
                        ? `${message.expediteur?.nom} ${message.expediteur?.prenom}`
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
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          estSelectionne
                            ? 'border-blue-300 bg-blue-50/80 shadow-sm'
                            : 'border-transparent bg-white hover:border-slate-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-800">
                                {titre}
                              </span>
                              {ongletActif === 'recus' && !message.lu && (
                                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                              )}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {message.contenu}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">
                            {new Date(message.dateEnvoi).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          {/* Lecture */}
          <section className="flex min-h-[50vh] flex-1 flex-col bg-white">
            {messageSelectionne ? (
              <>
                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {ongletActif === 'recus'
                          ? `${messageSelectionne.expediteur?.nom} ${messageSelectionne.expediteur?.prenom}`
                          : messageSelectionne.cible}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ongletActif === 'recus'
                          ? messageSelectionne.cibleTout
                            ? 'Message ciblé à tout le poste'
                            : 'Message personnel'
                          : `${messageSelectionne.nombreLectures ?? 0} lecture(s)`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        ongletActif === 'recus'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-violet-50 text-violet-700 border border-violet-200'
                      }`}
                    >
                      {ongletActif === 'recus' ? 'reçu' : 'envoyé'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 bg-gradient-to-b from-sky-50/30 to-white">
                  <div
                    className={`max-w-lg rounded-2xl p-4 shadow-sm ${
                      ongletActif === 'recus'
                        ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'
                        : 'ml-auto bg-blue-50 text-slate-800 border border-blue-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {messageSelectionne.contenu}
                    </p>
                    <div
                      className={`mt-3 text-[10px] ${
                        ongletActif === 'recus' ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {new Date(messageSelectionne.dateEnvoi).toLocaleString('fr-FR')}
                    </div>
                  </div>

                  {ongletActif === 'recus' && !messageSelectionne.lu && (
                    <button
                      onClick={() => marquerLu(messageSelectionne.id)}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                    >
                      Marquer comme lu
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
                Aucune conversation sélectionnée.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modale */}
      {modaleOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nouveau message</h2>
              <button
                type="button"
                onClick={() => setModaleOuverte(false)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={envoyerMessage} className="p-6 space-y-4">
              {erreur && (
                <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                  {erreur}
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Destinataire
                </label>
                <div className="mb-2 flex gap-4 text-sm">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      checked={typeCible === 'role'}
                      onChange={() => setTypeCible('role')}
                      className="text-blue-600"
                    />
                    Poste
                  </label>
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      checked={typeCible === 'personne'}
                      onChange={() => setTypeCible('personne')}
                      className="text-blue-600"
                    />
                    Personne
                  </label>
                </div>

                {typeCible === 'role' ? (
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={destinataireRole}
                    onChange={(e) => setDestinataireRole(e.target.value)}
                  >
                    {Object.entries(LIBELLES_ROLE).map(([valeur, libelle]) => (
                      <option key={valeur} value={valeur}>
                        {libelle}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={destinataireId}
                    onChange={(e) => setDestinataireId(e.target.value)}
                    required
                  >
                    <option value="">— Choisir une personne —</option>
                    {enseignants.map((ens) => (
                      <option key={ens.utilisateur.id} value={ens.utilisateur.id}>
                        {ens.utilisateur.nom} {ens.utilisateur.prenom}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Message
                </label>
                <textarea
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={contenu}
                  onChange={(e) => setContenu(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModaleOuverte(false)}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={envoi}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg shadow-blue-700/20 transition"
                >
                  {envoi ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}