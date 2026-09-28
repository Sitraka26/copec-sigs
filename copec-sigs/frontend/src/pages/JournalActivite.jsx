import { useEffect, useState } from 'react';
import api from '../api/client';

const LIBELLES_ACTION = {
  LOGIN: 'Connexion',
  CREATE_ELEVE: 'Création élève',
  CREATE_PAIEMENT: 'Enregistrement paiement',
  SAISIE_NOTES: 'Saisie de notes',
};

function formaterDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function JournalActivite() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api
      .get('/audit')
      .then(({ data }) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Journal d’activité</h1>
        <p className="text-slate-500 text-sm mt-1">
          Historique des actions importantes (connexions, créations, saisies…)
        </p>
      </div>

      {erreur && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm mb-4">
          {erreur}
        </p>
      )}

      {chargement ? (
        <p className="text-slate-500">Chargement du journal…</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-sm font-medium text-slate-700">Événements récents</span>
            <span className="text-xs bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full">
              {total} entrée{total > 1 ? 's' : ''}
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Aucune activité enregistrée pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Utilisateur</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                        {formaterDate(log.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        {log.utilisateur ? (
                          <span>
                            {log.utilisateur.prenom} {log.utilisateur.nom}
                            <span className="ml-1.5 text-xs text-slate-400">
                              ({log.utilisateur.role})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {LIBELLES_ACTION[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}