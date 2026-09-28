import { useEffect, useState } from 'react';
import api from '../api/client';

const LIBELLES_ACTION = {
  LOGIN: 'Connexion',
  CREATE_ELEVE: 'Création élève',
  CREATE_PAIEMENT: 'Enregistrement paiement',
  SAISIE_NOTES: 'Saisie de notes',
  GENERATE_CERTIFICAT: 'Génération certificat',
  DELETE_PAIEMENT: 'Suppression paiement',
  UPDATE_NOTE: 'Modification note',
};

const COULEURS_ACTION = {
  LOGIN: 'bg-blue-50 text-blue-700 border-blue-200',
  CREATE_ELEVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CREATE_PAIEMENT: 'bg-violet-50 text-violet-700 border-violet-200',
  SAISIE_NOTES: 'bg-amber-50 text-amber-800 border-amber-200',
  GENERATE_CERTIFICAT: 'bg-sky-50 text-sky-700 border-sky-200',
  DELETE_PAIEMENT: 'bg-red-50 text-red-700 border-red-200',
  UPDATE_NOTE: 'bg-orange-50 text-orange-700 border-orange-200',
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

function formaterDetails(details) {
  if (!details) return '—';
  if (typeof details === 'string') {
    try {
      const obj = JSON.parse(details);
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
    } catch {
      return details;
    }
  }
  if (typeof details === 'object') {
    return Object.entries(details)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  }
  return String(details);
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
    <div className="p-4 sm:p-8 min-h-full">
      {/* En-tête */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600 mb-1">
          Sécurité
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Journal d’activité</h1>
        <p className="text-sm text-slate-500 mt-1">
          Historique des actions importantes (connexions, créations, saisies…)
        </p>
      </div>

      {erreur && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">
          {erreur}
        </p>
      )}

      {chargement ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <span className="text-sm font-semibold text-slate-800">Événements récents</span>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
              {total} entrée{total > 1 ? 's' : ''}
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Aucune activité enregistrée pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Utilisateur</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                    <th className="px-5 py-3 font-semibold">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap tabular-nums">
                        {formaterDate(log.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        {log.utilisateur ? (
                          <span>
                            <span className="font-medium text-slate-900">
                              {log.utilisateur.prenom} {log.utilisateur.nom}
                            </span>
                            <span className="ml-1.5 text-[11px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {log.utilisateur.role}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            COULEURS_ACTION[log.action] ||
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {LIBELLES_ACTION[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate text-xs">
                        {formaterDetails(log.details)}
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