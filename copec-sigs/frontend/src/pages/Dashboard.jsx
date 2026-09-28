import { useEffect, useState } from 'react';
import api from '../api/client';
import { IconTrophy, IconAlertTriangle, IconWallet, IconBook, BadgeRang } from '../components/Icons';

const COULEURS_ALERTE = {
  danger: 'border-l-red-500 bg-gradient-to-r from-red-50 to-white',
  warning: 'border-l-orange-500 bg-gradient-to-r from-orange-50 to-white',
  info: 'border-l-blue-500 bg-gradient-to-r from-blue-50 to-white',
};

function CarteStat({ titre, valeur, sousTexte, accent = 'blue', icone }) {
  const accents = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
    green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/20',
    red: 'from-red-500 to-red-600 shadow-red-500/20',
    slate: 'from-slate-600 to-slate-700 shadow-slate-500/20',
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accents[accent]}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{titre}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{valeur}</p>
            {sousTexte && <p className="text-xs text-slate-400 mt-1.5">{sousTexte}</p>}
          </div>
          {icone && (
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accents[accent]} text-white flex items-center justify-center shadow-lg`}>
              {icone}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const NOMS_PERIODES = { 1: '1er Bim.', 2: '2e Bim.', 3: '3e Bim.', 4: '4e Bim.', 5: '5e Bim.' };

function GraphiqueEvolution({ donnees }) {
  const largeur = 480;
  const hauteur = 120;   
  const marge = 32;
  const maxValeur = 20;
  const largeurBarre = (largeur - marge * 2) / Math.max(donnees.length, 1) - 14;
 
  return (
    <svg viewBox={`0 0 ${largeur} ${hauteur + 36}`} className="w-full">
      {[0, 5, 10, 15, 20].map((v) => {
        const y = hauteur - (v / maxValeur) * hauteur;
        return (
          <g key={v}>
            <line x1={marge} y1={y} x2={largeur - 8} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x="4" y={y + 4} fontSize="10" fill="#94a3b8" fontFamily="system-ui">
              {v}
            </text>
          </g>
        );
      })}
      {donnees.map((d, i) => {
        const x = marge + i * ((largeur - marge * 2) / donnees.length) + 8;
        const h = d.moyenne !== null ? (d.moyenne / maxValeur) * hauteur : 0;
        const y = hauteur - h;
        return (
          <g key={d.periode}>
            {d.moyenne !== null ? (
              <>
                <defs>
                  <linearGradient id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
                <rect x={x} y={y} width={largeurBarre} height={h} rx="6" fill={`url(#bar-${i})`} />
                <text
                  x={x + largeurBarre / 2}
                  y={y - 6}
                  fontSize="11"
                  textAnchor="middle"
                  fill="#1e293b"
                  fontWeight="700"
                  fontFamily="system-ui"
                >
                  {d.moyenne}
                </text>
              </>
            ) : (
              <text x={x + largeurBarre / 2} y={hauteur - 8} fontSize="10" textAnchor="middle" fill="#cbd5e1">
                —
              </text>
            )}
            <text
              x={x + largeurBarre / 2}
              y={hauteur + 20}
              fontSize="11"
              textAnchor="middle"
              fill="#64748b"
              fontFamily="system-ui"
            >
              {NOMS_PERIODES[d.periode]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SectionTitle({ children, badge }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-slate-700 tracking-wide">{children}</h2>
      {badge !== undefined && (
        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [alertes, setAlertes] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/insights'), api.get('/alertes')])
      .then(([resStats, resInsights, resAlertes]) => {
        setStats(resStats.data);
        setInsights(resInsights.data);
        setAlertes(resAlertes.data.alertes || []);
      })
      .catch((err) => setErreur(err.response?.data?.error || 'Erreur de chargement'))
      .finally(() => setChargement(false));
  }, []);

  const aAccesFinances = stats && 'soldeGlobalDu' in stats;

  return (
    <div className="p-4 sm:p-8 bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50/30 min-h-full">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden mb-8 shadow-xl shadow-blue-900/10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-blue-700" />
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent" />
        <div className="relative p-6 sm:p-8 flex flex-wrap justify-between gap-4 items-end">
          <div>
            <p className="text-blue-300/90 text-[11px] font-semibold uppercase tracking-[0.2em] mb-3">
              Tableau de bord
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Bienvenue{utilisateur ? `, ${utilisateur.prenom}` : ''}
            </h1>
            <p className="text-blue-100/80 text-sm mt-2">
              {stats?.anneeActive
                ? `Année scolaire ${stats.anneeActive}`
                : 'SIGS COPEC — Gestion scolaire'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/90 bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3.5 py-2">
              {utilisateur?.role || 'Utilisateur'}
            </span>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="mb-8 bg-white/80 backdrop-blur border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Alertes intelligentes
            </h2>
            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">
              {alertes.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {alertes.map((alerte, index) => (
              <li
                key={index}
                className={`px-5 py-3.5 flex items-start gap-3 border-l-4 ${
                  COULEURS_ALERTE[alerte.niveau] || COULEURS_ALERTE.info
                }`}
              >
                <span className="mt-0.5 text-slate-600 shrink-0">
                  {alerte.type === 'RETARD_PAIEMENT' && <IconWallet className="w-5 h-5" />}
                  {alerte.type === 'ABSENCE_REPETEE' && <IconAlertTriangle className="w-5 h-5" />}
                  {alerte.type === 'NOTE_FAIBLE' && <IconBook className="w-5 h-5" />}
                  {!['RETARD_PAIEMENT', 'ABSENCE_REPETEE', 'NOTE_FAIBLE'].includes(alerte.type) && (
                    <IconAlertTriangle className="w-5 h-5" />
                  )}
                </span>
                <div>
                  <p className="font-semibold text-sm text-slate-800">{alerte.titre}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{alerte.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {erreur && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm mb-4">{erreur}</p>
      )}

      {chargement ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Chargement des statistiques…</p>
          </div>
        </div>
      ) : !stats?.anneeActive ? (
        <p className="text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-5 text-sm">
          {stats?.message || 'Aucune année scolaire active.'}
        </p>
      ) : (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <CarteStat
              titre="Élèves inscrits"
              valeur={stats.effectifTotal}
              accent="blue"
              icone={<span className="text-lg font-bold">É</span>}
            />
            <CarteStat
              titre="Classes"
              valeur={stats.nombreClasses}
              accent="slate"
              icone={<span className="text-lg font-bold">C</span>}
            />
            <CarteStat
              titre="Enseignants"
              valeur={stats.nombreEnseignants}
              accent="blue"
              icone={<span className="text-lg font-bold">P</span>}
            />
          </div>

          {/* Présences */}
          <SectionTitle>Présences aujourd&apos;hui</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <CarteStat titre="Présents" valeur={stats.presencesJour?.PRESENT ?? 0} accent="green" />
            <CarteStat titre="Absents" valeur={stats.presencesJour?.ABSENT ?? 0} accent="red" />
            <CarteStat titre="Retards" valeur={stats.presencesJour?.RETARD ?? 0} accent="orange" />
          </div>

          {/* Finances */}
          {aAccesFinances && (
            <>
              <SectionTitle>Finances</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <CarteStat
                  titre="Paiements ce mois-ci"
                  valeur={`${stats.paiementsMois.total.toLocaleString('fr-FR')} Ar`}
                  sousTexte={`${stats.paiementsMois.nombre} versement(s)`}
                  accent="green"
                  icone={<IconWallet className="w-5 h-5" />}
                />
                <CarteStat
                  titre="Solde global dû (année)"
                  valeur={`${stats.soldeGlobalDu.toLocaleString('fr-FR')} Ar`}
                  sousTexte="Tous élèves confondus"
                  accent={stats.soldeGlobalDu > 0 ? 'orange' : 'green'}
                  icone={<IconWallet className="w-5 h-5" />}
                />
              </div>
            </>
          )}

          {insights && (
            <>
              <SectionTitle>Évolution de la moyenne générale</SectionTitle>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-8 max-w-2xl">
  <GraphiqueEvolution
  donnees={(insights.evolutionMoyennes || []).filter((d) => d.moyenne !== null)}
/>
</div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <IconTrophy className="w-4 h-4" />
                    </span>
                    Palmarès de l&apos;école
                  </h2>
                  {!insights.palmares?.length ? (
                    <p className="text-xs text-slate-400">Aucun bulletin généré pour l&apos;instant.</p>
                  ) : (
                    <ul className="space-y-3">
                      {insights.palmares.map((e, i) => (
                        <li
                          key={e.eleveId}
                          className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                        >
                          <span className="flex items-center gap-2.5 text-sm text-slate-700">
                            <BadgeRang rang={i + 1} />
                            <span className="font-medium">
                              {e.nom} {e.prenom}
                            </span>
                          </span>
                          <span className="font-bold text-slate-900 tabular-nums">
                            {e.moyenne.toFixed(2)}
                            <span className="text-slate-400 font-normal text-xs">/20</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-sm">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <IconBook className="w-4 h-4" />
                    </span>
                    Matières
                  </h2>
                  {insights.matierePlusDifficile ? (
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                        <p className="text-xs text-orange-600 font-medium mb-1">Plus difficile</p>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-slate-800">
                            {insights.matierePlusDifficile.nom}
                          </span>
                          <span className="font-bold text-orange-700">
                            {insights.matierePlusDifficile.moyenne.toFixed(2)}/20
                          </span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <p className="text-xs text-emerald-600 font-medium mb-1">Plus forte</p>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-semibold text-slate-800">
                            {insights.matierePlusForte.nom}
                          </span>
                          <span className="font-bold text-emerald-700">
                            {insights.matierePlusForte.moyenne.toFixed(2)}/20
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Aucune note saisie pour l&apos;instant.</p>
                  )}
                </div>
              </div>

              <div
                className={`grid ${
                  insights.retardsPaiement ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                } gap-4 mb-8`}
              >
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
                  <h2 className="font-semibold text-red-700 mb-4 flex items-center gap-2 text-sm">
                    <IconAlertTriangle className="w-4 h-4" />
                    Élèves à surveiller
                  </h2>
                  {!insights.elevesARisque?.length ? (
                    <p className="text-xs text-slate-400">Aucun élève signalé actuellement.</p>
                  ) : (
                    <ul className="space-y-3">
                      {insights.elevesARisque.map((e) => (
                        <li key={e.eleveId} className="pb-3 border-b border-slate-50 last:border-0">
                          <div className="font-medium text-sm text-slate-800">
                            {e.nom} {e.prenom}{' '}
                            <span className="text-slate-400 font-normal">({e.classe})</span>
                          </div>
                          <div className="text-xs text-red-600 mt-0.5">{e.raisons.join(' · ')}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {insights.retardsPaiement && (
                  <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
                    <h2 className="font-semibold text-orange-700 mb-4 flex items-center gap-2 text-sm">
                      <IconWallet className="w-4 h-4" />
                      Retards de paiement
                    </h2>
                    {insights.retardsPaiement.length === 0 ? (
                      <p className="text-xs text-slate-400">Aucun retard de paiement actuellement.</p>
                    ) : (
                      <ul className="space-y-3">
                        {insights.retardsPaiement.map((e) => (
                          <li key={e.eleveId} className="flex justify-between items-center text-sm">
                            <span>
                              {e.nom} {e.prenom}{' '}
                              <span className="text-slate-400">({e.classe})</span>
                            </span>
                            <span className="font-bold text-orange-700 tabular-nums">
                              {e.reste.toLocaleString('fr-FR')} Ar
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {insights.elevesAAppeler?.length > 0 && (
                <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="font-bold text-red-700 mb-1">Appel urgent aux parents</h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Absents 3 jours consécutifs ou plus — contact téléphonique requis.
                  </p>
                  <ul className="space-y-3">
                    {insights.elevesAAppeler.map((e) => (
                      <li
                        key={e.eleveId}
                        className="flex justify-between items-center bg-white/80 rounded-xl px-4 py-3 border border-red-100"
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-800">
                            {e.nom} {e.prenom}{' '}
                            <span className="text-slate-400 font-normal">({e.classe})</span>
                          </div>
                          <div className="text-xs text-red-600 mt-0.5">
                            {e.joursConsecutifs} jours d&apos;absence consécutifs
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="text-slate-500">{e.contactUrgenceNom || 'Contact non renseigné'}</div>
                          <div className="font-bold text-slate-800">{e.contactUrgenceTel || '—'}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}