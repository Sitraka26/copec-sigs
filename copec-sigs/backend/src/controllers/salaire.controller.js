const prisma = require('../config/prisma');

/** Minutes entre "HH:mm" et "HH:mm" */
function dureeHeures(heureDebut, heureFin) {
  const [h1, m1] = heureDebut.split(':').map(Number);
  const [h2, m2] = heureFin.split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
}

/** Obtenir le cycle principal directement défini sur l'enseignant */
async function cycleDominantEnseignant(enseignantId) {
  const ens = await prisma.enseignant.findUnique({
    where: { id: enseignantId },
    select: { cyclePrincipal: true },
  });
  return ens?.cyclePrincipal || null;
}

/** GET /api/salaires/parametres */
async function getParametres(req, res, next) {
  try {
    const etabId = req.user.etablissementId;

    const etab = await prisma.etablissement.findUnique({ where: { id: etabId } });
    if (!etab) {
      return res.status(400).json({
        error: `Établissement introuvable (${etabId}). Reconnecte-toi ou vérifie le seed.`,
      });
    }

    let p = await prisma.parametreSalaire.findFirst({
      where: { etablissementId: etabId },
    });

    if (!p) {
      p = await prisma.parametreSalaire.create({
        data: {
          etablissementId: etabId,
          salaireFixePresco: 0,
          salaireFixePrimaire: 0,
          tauxHoraireSecondaire: 0,
          maxHeuresSemaine: 6,
        },
      });
    }
    res.json(p);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/salaires/parametres */
async function updateParametres(req, res, next) {
  try {
    const etabId = req.user.etablissementId;
    const etab = await prisma.etablissement.findUnique({ where: { id: etabId } });
    if (!etab) {
      return res.status(400).json({
        error: `Établissement introuvable (${etabId}). Reconnecte-toi ou vérifie le seed.`,
      });
    }
    const {
      salaireFixePresco,
      salaireFixePrimaire,
      tauxHoraireSecondaire,
      maxHeuresSemaine,
    } = req.body;

    let p = await prisma.parametreSalaire.findFirst({
      where: { etablissementId: etabId },
    });

    const data = {
      salaireFixePresco: Number(salaireFixePresco) || 0,
      salaireFixePrimaire: Number(salaireFixePrimaire) || 0,
      tauxHoraireSecondaire: Number(tauxHoraireSecondaire) || 0,
      maxHeuresSemaine: Number(maxHeuresSemaine) || 6,
    };

    if (p) {
      p = await prisma.parametreSalaire.update({ where: { id: p.id }, data });
    } else {
      p = await prisma.parametreSalaire.create({
        data: { ...data, etablissementId: etabId },
      });
    }
    res.json(p);
  } catch (err) {
    next(err);
  }
}

/**
 * Calcul salaire d'un enseignant pour un mois (YYYY-MM)
 * GET /api/salaires/calcul?enseignantId=&mois=2026-09
 */
async function calculerSalaire(req, res, next) {
  try {
    const { enseignantId, mois } = req.query; // mois = "2026-09"
    if (!enseignantId || !mois) {
      return res.status(400).json({ error: 'enseignantId et mois (YYYY-MM) requis' });
    }

    const [annee, moisNum] = mois.split('-').map(Number);
    const debut = new Date(annee, moisNum - 1, 1);
    const fin = new Date(annee, moisNum, 0, 23, 59, 59);

    const enseignant = await prisma.enseignant.findFirst({
      where: {
        id: enseignantId,
        utilisateur: { etablissementId: req.user.etablissementId },
      },
      include: { utilisateur: true },
    });
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    const params = await prisma.parametreSalaire.findFirst({
      where: { etablissementId: req.user.etablissementId },
    });
    if (!params) {
      return res.status(400).json({ error: 'Paramètres salaire non configurés' });
    }

    // Utilise le cyclePrincipal directement présent sur le profil enseignant
    const cycle =
      enseignant.cyclePrincipal ||
      (await cycleDominantEnseignant(enseignantId, req.user.etablissementId));
    // Présco / Primaire → fixe
    if (cycle === 'PRESCOLAIRE' || cycle === 'PRIMAIRE') {
      const montant =
        cycle === 'PRESCOLAIRE'
          ? params.salaireFixePresco
          : params.salaireFixePrimaire;
      return res.json({
        enseignant: {
          id: enseignant.id,
          nom: enseignant.utilisateur.nom,
          prenom: enseignant.utilisateur.prenom,
        },
        mois,
        mode: 'FIXE',
        cycle,
        montant,
        detail: 'Salaire mensuel fixe',
      });
    }

    // Secondaire (COLLEGE / LYCEE) → heures faites × taux (plafond maxHeuresSemaine)
    const seances = await prisma.emploiDuTemps.findMany({
      where: { enseignantId, etablissementId: req.user.etablissementId },
    });

    // Heures prévues par jour de semaine (1-6)
    const heuresParJourSemaine = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const s of seances) {
      heuresParJourSemaine[s.jour] += dureeHeures(s.heureDebut, s.heureFin);
    }

    // Présences du mois
    const presences = await prisma.presenceEnseignant.findMany({
      where: {
        enseignantId,
        date: { gte: debut, lte: fin },
      },
    });

    // Événements du mois (jours non travaillés école)
    const evenements = await prisma.evenementScolaire.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        dateDebut: { lte: fin },
        OR: [{ dateFin: null }, { dateFin: { gte: debut } }],
      },
    });

    function estJourEvenement(d) {
      return evenements.some((ev) => {
        const deb = new Date(ev.dateDebut);
        const f = ev.dateFin ? new Date(ev.dateFin) : deb;
        const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return (
          jour >= new Date(deb.getFullYear(), deb.getMonth(), deb.getDate()) &&
          jour <= new Date(f.getFullYear(), f.getMonth(), f.getDate())
        );
      });
    }

    let totalHeuresFaites = 0;
    let totalHeuresPrevues = 0;

    // Parcourir chaque jour du mois
    for (let day = 1; day <= fin.getDate(); day++) {
      const d = new Date(annee, moisNum - 1, day);
      const jourSemaine = d.getDay(); // 0=dim ... 6=sam
      const jourEdt = jourSemaine === 0 ? null : jourSemaine; // 1=lun ... 6=sam
      if (!jourEdt) continue;

      const prevues = heuresParJourSemaine[jourEdt] || 0;
      if (prevues === 0) continue;

      totalHeuresPrevues += prevues;

      if (estJourEvenement(d)) {
        // Jour événement : 0h payée sauf saisie manuelle
        const p = presences.find(
          (x) => new Date(x.date).toDateString() === d.toDateString()
        );
        totalHeuresFaites += p ? Number(p.heuresFaites) : 0;
        continue;
      }

      const p = presences.find(
        (x) => new Date(x.date).toDateString() === d.toDateString()
      );
      if (p) {
        totalHeuresFaites += p.present ? Number(p.heuresFaites || prevues) : 0;
      } else {
        // Pas de saisie → on compte les heures prévues (présent par défaut)
        totalHeuresFaites += prevues;
      }
    }

    // Plafond : maxHeuresSemaine × nombre de semaines du mois
    const nbSemaines = Math.ceil(fin.getDate() / 7);
    const plafond = params.maxHeuresSemaine * nbSemaines;
    const heuresPayees = Math.min(totalHeuresFaites, plafond);
    const montant = heuresPayees * params.tauxHoraireSecondaire;

    res.json({
      enseignant: {
        id: enseignant.id,
        nom: enseignant.utilisateur.nom,
        prenom: enseignant.utilisateur.prenom,
      },
      mois,
      mode: 'HORAIRE',
      cycle: cycle || 'COLLEGE',
      heuresPrevues: Math.round(totalHeuresPrevues * 100) / 100,
      heuresFaites: Math.round(totalHeuresFaites * 100) / 100,
      heuresPayees: Math.round(heuresPayees * 100) / 100,
      plafond,
      tauxHoraire: params.tauxHoraireSecondaire,
      montant: Math.round(montant),
      detail: `Heures payées × ${params.tauxHoraireSecondaire} Ar/h (max ${params.maxHeuresSemaine} h/semaine)`,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/salaires/presences */
async function saisirPresence(req, res, next) {
  try {
    const { enseignantId, date, present, heuresFaites, motifAbsence } = req.body;
    if (!enseignantId || !date) {
      return res.status(400).json({ error: 'enseignantId et date requis' });
    }

    const ens = await prisma.enseignant.findFirst({
      where: {
        id: enseignantId,
        utilisateur: { etablissementId: req.user.etablissementId },
      },
    });
    if (!ens) return res.status(404).json({ error: 'Enseignant introuvable' });

    const jour = new Date(date);
    // Heures prévues ce jour selon EDT
    const jourSemaine = jour.getDay(); // 0=dim
    const jourEdt = jourSemaine === 0 ? null : jourSemaine;
    let heuresPrevues = 0;
    if (jourEdt) {
      const seances = await prisma.emploiDuTemps.findMany({
        where: {
          enseignantId,
          etablissementId: req.user.etablissementId,
          jour: jourEdt,
        },
      });
      for (const s of seances) {
        const [h1, m1] = s.heureDebut.split(':').map(Number);
        const [h2, m2] = s.heureFin.split(':').map(Number);
        heuresPrevues += Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
      }
    }

    const estPresent = present === true || present === 'true';
    const data = {
      etablissementId: req.user.etablissementId,
      enseignantId,
      date: jour,
      present: estPresent,
      heuresPrevues,
      heuresFaites: estPresent
        ? Number(heuresFaites != null ? heuresFaites : heuresPrevues)
        : 0,
      motifAbsence: estPresent ? null : motifAbsence || 'Absence',
    };

    const record = await prisma.presenceEnseignant.upsert({
      where: {
        enseignantId_date: { enseignantId, date: jour },
      },
      update: data,
      create: data,
    });

    res.json(record);
  } catch (err) {
    next(err);
  }
}

/** GET /api/salaires/presences?enseignantId=&mois=2026-09 */
async function listerPresences(req, res, next) {
  try {
    const { enseignantId, mois } = req.query;
    if (!enseignantId || !mois) {
      return res.status(400).json({ error: 'enseignantId et mois requis' });
    }
    const [annee, moisNum] = mois.split('-').map(Number);
    const debut = new Date(annee, moisNum - 1, 1);
    const fin = new Date(annee, moisNum, 0, 23, 59, 59);

    const liste = await prisma.presenceEnseignant.findMany({
      where: {
        enseignantId,
        etablissementId: req.user.etablissementId,
        date: { gte: debut, lte: fin },
      },
      orderBy: { date: 'asc' },
    });
    res.json(liste);
  } catch (err) {
    next(err);
  }
}

/** Liste calcul pour tous les enseignants du mois */
async function calculerTous(req, res, next) {
  try {
    const { mois } = req.query;
    if (!mois) return res.status(400).json({ error: 'mois (YYYY-MM) requis' });

    const enseignants = await prisma.enseignant.findMany({
      where: { utilisateur: { etablissementId: req.user.etablissementId } },
      include: { utilisateur: true },
    });

    const resultats = [];
    for (const ens of enseignants) {
      req.query.enseignantId = ens.id;
      const fakeRes = {
        json: (data) => resultats.push(data),
        status: () => ({ json: (data) => resultats.push({ error: data.error, enseignantId: ens.id }) }),
      };
      await calculerSalaire(req, fakeRes, next);
    }
    res.json({ mois, resultats });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getParametres,
  updateParametres,
  calculerSalaire,
  calculerTous,
  saisirPresence,
  listerPresences,
};