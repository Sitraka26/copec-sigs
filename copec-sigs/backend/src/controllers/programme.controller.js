const prisma = require('../config/prisma');

const PROGRAMMES_PRESCOLAIRES = {
  GS: [
    'Graphisme',
    'Pré-Lecture',
    'Pré-Écriture',
    'Langage',
    'Découverte',
    'Pré-Maths',
    'Calcul',
    'Chant / Récit',
    'Coloriage / Motricité Fine',
    "Lecture d'images",
  ],
  PS: [
    'Langage',
    'EVEIL',
    'Graphisme',
    'Pré-Écriture',
    'Pré-Lecture',
    'Pré-Maths',
    'Arts Plastiques',
    'Chant et Récitation',
    'Motricité',
  ],
  MS: [
    'Langage',
    'EVEIL',
    'Graphisme',
    'Pré-Écriture',
    'Pré-Lecture',
    'Pré-Maths',
    'Arts Plastiques',
    'Chant et Récitation',
    'Motricité',
  ],
  DEFAUT: [
    'Langage',
    'EVEIL',
    'Graphisme',
    'Pré-Écriture',
    'Pré-Lecture',
    'Pré-Maths',
    'Arts Plastiques',
    'Chant et Récitation',
    'Motricité',
    'Découverte',
  ],
};

/** Matières typiques primaire (hors préscolaire) */
const PROGRAMME_PRIMAIRE = [
  'Malagasy',
  'Français',
  'Mathématiques',
  'Éducation scientifique',
  'Histoire-Géographie',
  'Anglais',
  'EPS',
  'Éducation civique',
];

/** Matières typiques collège / lycée */
const PROGRAMME_SECONDAIRE = [
  'Malagasy',
  'Français',
  'Anglais',
  'Histoire-Géographie',
  'Mathématiques',
  'Physique-Chimie',
  'SVT',
  'EPS',
  'Philosophie',
  'SES',
];

/** Tous les noms préscolaires (pour les exclure des autres cycles) */
const NOMS_PRESCO = new Set(
  Object.values(PROGRAMMES_PRESCOLAIRES).flat()
);

function obtenirTypePrescolaire(libelle = '') {
  const valeur = libelle
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/\bG ?S\b|GRANDE SECTION/.test(valeur)) return 'GS';
  if (/\bP ?S\b|PETITE SECTION/.test(valeur)) return 'PS';
  if (/\bM ?S\b|MOYENNE SECTION/.test(valeur)) return 'MS';
  if (/PRESCOLAIRE|PRÉSCOLAIRE|MATERNELLE/.test(valeur)) return 'DEFAUT';
  return 'DEFAUT';
}

async function assurerProgrammePrescolaire(niveau, etablissementId) {
  if (niveau.cycle !== 'PRESCOLAIRE') return;

  const type = obtenirTypePrescolaire(niveau.libelle) || 'DEFAUT';
  const noms = PROGRAMMES_PRESCOLAIRES[type] || PROGRAMMES_PRESCOLAIRES.DEFAUT;

  for (const nom of noms) {
    let matiere = await prisma.matiere.findFirst({
      where: { etablissementId, nom },
    });
    if (!matiere) {
      matiere = await prisma.matiere.create({
        data: { etablissementId, nom, coefficient: 10 },
      });
    }
    await prisma.niveauMatiere.upsert({
      where: {
        niveauId_matiereId: {
          niveauId: niveau.id,
          matiereId: matiere.id,
        },
      },
      update: { coefficient: 10 },
      create: {
        niveauId: niveau.id,
        matiereId: matiere.id,
        coefficient: 10,
      },
    });
  }
}

/**
 * Filtre les matières affichées selon le cycle du niveau
 */
function filtrerMatieresParCycle(niveau, matieres, overrideParMatiere) {
  if (niveau.cycle === 'PRESCOLAIRE') {
    const type = obtenirTypePrescolaire(niveau.libelle) || 'DEFAUT';
    const noms = new Set(
      PROGRAMMES_PRESCOLAIRES[type] || PROGRAMMES_PRESCOLAIRES.DEFAUT
    );
    return matieres.filter((m) => noms.has(m.nom));
  }

  if (niveau.cycle === 'PRIMAIRE') {
    const noms = new Set(PROGRAMME_PRIMAIRE);
    return matieres.filter(
      (m) =>
        (noms.has(m.nom) || overrideParMatiere[m.id] !== undefined) &&
        !NOMS_PRESCO.has(m.nom)
    );
  }

  // COLLEGE / LYCEE : jamais les matières préscolaires
  const nomsSec = new Set(PROGRAMME_SECONDAIRE);
  return matieres.filter((m) => {
    if (NOMS_PRESCO.has(m.nom)) return false;
    // Déjà dans le programme enregistré → toujours visible
    if (overrideParMatiere[m.id] !== undefined) return true;
    // Catalogue secondaire connu
    if (nomsSec.has(m.nom)) return true;
    // Autre matière « collège/lycée » déjà créée (ex. Allemand) : visible mais pas cochée par défaut
    return true;
  }).filter((m) => !NOMS_PRESCO.has(m.nom));
}

/**
 * GET /api/niveaux/:id/programme
 */
async function obtenirProgramme(req, res, next) {
  try {
    const niveau = await prisma.niveau.findUnique({
      where: { id: req.params.id },
    });
    if (!niveau) return res.status(404).json({ error: 'Niveau introuvable' });

    await assurerProgrammePrescolaire(niveau, req.user.etablissementId);

    const overrides = await prisma.niveauMatiere.findMany({
      where: { niveauId: niveau.id },
    });
    const overrideParMatiere = {};
    overrides.forEach((o) => {
      overrideParMatiere[o.matiereId] = o.coefficient;
    });

    let matieres = await prisma.matiere.findMany({
      where: { etablissementId: req.user.etablissementId },
      orderBy: { nom: 'asc' },
    });

    matieres = filtrerMatieresParCycle(niveau, matieres, overrideParMatiere);

    const programme = matieres.map((m) => {
      const personnalise = overrideParMatiere[m.id] !== undefined;

      let actif;
      if (niveau.cycle === 'PRESCOLAIRE') {
        actif = true;
      } else if (overrides.length === 0) {
        // Rien d’enregistré : coché seulement si matière du catalogue cycle
        if (niveau.cycle === 'PRIMAIRE') {
          actif = PROGRAMME_PRIMAIRE.includes(m.nom);
        } else {
          actif = PROGRAMME_SECONDAIRE.includes(m.nom);
        }
      } else {
        // Programme déjà sauvé : uniquement les lignes en base
        actif = personnalise;
      }

      return {
        matiereId: m.id,
        nom: m.nom,
        coefficient: overrideParMatiere[m.id] ?? m.coefficient,
        personnalise,
        actif,
      };
    });

    res.json({ niveau, programme });
  } catch (err) {
    next(err);
  }
}

/** GET matières actives du programme (pour Notes) */
async function listerMatieresParNiveau(req, res, next) {
  try {
    const { niveauId } = req.params;

    const niveau = await prisma.niveau.findFirst({ where: { id: niveauId } });
    if (!niveau) {
      return res.status(404).json({ error: 'Niveau introuvable' });
    }

    await assurerProgrammePrescolaire(niveau, req.user.etablissementId);

    const lignes = await prisma.niveauMatiere.findMany({
      where: { niveauId },
      include: {
        matiere: {
          select: {
            id: true,
            nom: true,
            coefficient: true,
            domaine: true,
            etablissementId: true,
          },
        },
      },
      orderBy: { matiere: { nom: 'asc' } },
    });

    let matieres = lignes
      .filter(
        (l) =>
          l.matiere && l.matiere.etablissementId === req.user.etablissementId
      )
      .map((l) => ({
        id: l.matiere.id,
        nom: l.matiere.nom,
        coefficient: l.coefficient,
        domaine: l.matiere.domaine,
      }));

    // Sécurité : en collège/lycée/primaire, exclure le présco même s’il était en base
    if (niveau.cycle !== 'PRESCOLAIRE') {
      matieres = matieres.filter((m) => !NOMS_PRESCO.has(m.nom));
    }

    res.json(matieres);
  } catch (err) {
    next(err);
  }
}

async function mettreAJourProgramme(req, res, next) {
  try {
    const { matieres } = req.body;
    if (!Array.isArray(matieres)) {
      return res.status(400).json({ error: 'matieres doit être un tableau' });
    }

    const niveau = await prisma.niveau.findUnique({
      where: { id: req.params.id },
    });
    if (!niveau) return res.status(404).json({ error: 'Niveau introuvable' });

    await assurerProgrammePrescolaire(niveau, req.user.etablissementId);

    for (const m of matieres) {
      if (typeof m.coefficient !== 'number' || m.coefficient <= 0) {
        return res.status(400).json({
          error: `Coefficient invalide pour la matière ${m.matiereId}`,
        });
      }
    }

    const matiereIds = matieres.map((m) => m.matiereId);
    const matieresAutorisees = await prisma.matiere.findMany({
      where: {
        id: { in: matiereIds },
        etablissementId: req.user.etablissementId,
      },
    });
    if (matieresAutorisees.length !== matiereIds.length) {
      return res.status(400).json({
        error: 'Une matière sélectionnée n’appartient pas à votre établissement',
      });
    }

    if (niveau.cycle === 'PRESCOLAIRE') {
      const type = obtenirTypePrescolaire(niveau.libelle) || 'DEFAUT';
      const nomsOk = new Set(
        PROGRAMMES_PRESCOLAIRES[type] || PROGRAMMES_PRESCOLAIRES.DEFAUT
      );
      const invalide = matieresAutorisees.find((m) => !nomsOk.has(m.nom));
      if (invalide) {
        return res.status(400).json({
          error: `« ${invalide.nom} » n’appartient pas au programme préscolaire (${type}).`,
        });
      }
    } else {
      // Interdire d’enregistrer des matières préscolaires sur primaire / collège / lycée
      const invalide = matieresAutorisees.find((m) => NOMS_PRESCO.has(m.nom));
      if (invalide) {
        return res.status(400).json({
          error: `« ${invalide.nom} » est une matière préscolaire et ne peut pas être au programme de ${niveau.libelle}.`,
        });
      }
    }

    await prisma.$transaction([
      prisma.niveauMatiere.deleteMany({ where: { niveauId: niveau.id } }),
      prisma.niveauMatiere.createMany({
        data: matieres.map((m) => ({
          niveauId: niveau.id,
          matiereId: m.matiereId,
          coefficient: m.coefficient,
        })),
      }),
    ]);

    res.json({ message: 'Programme mis à jour' });
  } catch (err) {
    next(err);
  }
}

async function obtenirCoefficientsPourNiveau(niveauId, etablissementId) {
  const niveau = await prisma.niveau.findUnique({ where: { id: niveauId } });
  if (niveau) await assurerProgrammePrescolaire(niveau, etablissementId);

  const overrides = await prisma.niveauMatiere.findMany({
    where: { niveauId },
  });

  if (overrides.length > 0) {
    const map = {};
    // Exclure le présco si le niveau n’est pas préscolaire
    const matieres = await prisma.matiere.findMany({
      where: { id: { in: overrides.map((o) => o.matiereId) } },
    });
    const parId = Object.fromEntries(matieres.map((m) => [m.id, m]));
    overrides.forEach((o) => {
      const m = parId[o.matiereId];
      if (!m) return;
      if (niveau && niveau.cycle !== 'PRESCOLAIRE' && NOMS_PRESCO.has(m.nom)) {
        return;
      }
      map[o.matiereId] = o.coefficient;
    });
    return map;
  }

  // Pas de programme enregistré : ne plus renvoyer TOUTES les matières
  return {};
}

async function listerPlanifications(req, res, next) {
  try {
    const { classeId, matiereId, anneeScolaireId, periode } = req.query;
    const planifications = await prisma.planificationScolaire.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        ...(classeId ? { classeId } : {}),
        ...(matiereId ? { matiereId } : {}),
        ...(anneeScolaireId ? { anneeScolaireId } : {}),
        ...(periode ? { periode: Number(periode) } : {}),
      },
      include: {
        classe: { include: { niveau: true } },
        matiere: true,
        anneeScolaire: true,
      },
      orderBy: [{ datePrevue: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(planifications);
  } catch (err) {
    next(err);
  }
}

async function creerPlanification(req, res, next) {
  try {
    const {
      classeId,
      matiereId,
      anneeScolaireId,
      periode,
      titre,
      objectifs,
      contenu,
      volumeHoraire,
      statut,
      datePrevue,
    } = req.body;

    if (!classeId || !matiereId || !anneeScolaireId || !titre) {
      return res.status(400).json({
        error: 'classeId, matiereId, anneeScolaireId et titre sont requis',
      });
    }
    if (
      periode !== undefined &&
      periode !== null &&
      (!Number.isInteger(Number(periode)) ||
        Number(periode) < 1 ||
        Number(periode) > 5)
    ) {
      return res.status(400).json({
        error: 'La période doit être comprise entre 1 et 5',
      });
    }
    if (
      volumeHoraire !== undefined &&
      volumeHoraire !== null &&
      (Number.isNaN(Number(volumeHoraire)) || Number(volumeHoraire) <= 0)
    ) {
      return res.status(400).json({
        error: 'Le volume horaire doit être supérieur à zéro',
      });
    }

    const [classe, matiere, annee] = await Promise.all([
      prisma.classe.findFirst({
        where: { id: classeId, etablissementId: req.user.etablissementId },
      }),
      prisma.matiere.findFirst({
        where: { id: matiereId, etablissementId: req.user.etablissementId },
      }),
      prisma.anneeScolaire.findFirst({
        where: {
          id: anneeScolaireId,
          etablissementId: req.user.etablissementId,
        },
      }),
    ]);
    if (!classe || !matiere || !annee) {
      return res.status(404).json({
        error: 'Classe, matière ou année scolaire introuvable',
      });
    }

    const planification = await prisma.planificationScolaire.create({
      data: {
        etablissementId: req.user.etablissementId,
        classeId,
        matiereId,
        anneeScolaireId,
        periode: periode ? Number(periode) : null,
        titre: titre.trim(),
        objectifs: objectifs?.trim() || null,
        contenu: contenu?.trim() || null,
        volumeHoraire: volumeHoraire ? Number(volumeHoraire) : null,
        statut: statut || 'A_PLANIFIER',
        datePrevue: datePrevue ? new Date(datePrevue) : null,
      },
      include: {
        classe: { include: { niveau: true } },
        matiere: true,
        anneeScolaire: true,
      },
    });
    res.status(201).json(planification);
  } catch (err) {
    next(err);
  }
}

async function modifierPlanification(req, res, next) {
  try {
    const existante = await prisma.planificationScolaire.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!existante) {
      return res.status(404).json({ error: 'Planification introuvable' });
    }

    const {
      titre,
      objectifs,
      contenu,
      volumeHoraire,
      statut,
      periode,
      datePrevue,
    } = req.body;

    const planification = await prisma.planificationScolaire.update({
      where: { id: existante.id },
      data: {
        ...(titre !== undefined ? { titre: titre.trim() } : {}),
        ...(objectifs !== undefined
          ? { objectifs: objectifs?.trim() || null }
          : {}),
        ...(contenu !== undefined ? { contenu: contenu?.trim() || null } : {}),
        ...(volumeHoraire !== undefined
          ? {
              volumeHoraire: volumeHoraire ? Number(volumeHoraire) : null,
            }
          : {}),
        ...(statut !== undefined ? { statut } : {}),
        ...(periode !== undefined
          ? { periode: periode ? Number(periode) : null }
          : {}),
        ...(datePrevue !== undefined
          ? { datePrevue: datePrevue ? new Date(datePrevue) : null }
          : {}),
      },
      include: {
        classe: { include: { niveau: true } },
        matiere: true,
        anneeScolaire: true,
      },
    });
    res.json(planification);
  } catch (err) {
    next(err);
  }
}

async function supprimerPlanification(req, res, next) {
  try {
    const existante = await prisma.planificationScolaire.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!existante) {
      return res.status(404).json({ error: 'Planification introuvable' });
    }
    await prisma.planificationScolaire.delete({ where: { id: existante.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listerEvenements(req, res, next) {
  try {
    const evenements = await prisma.evenementScolaire.findMany({
      where: { etablissementId: req.user.etablissementId },
      include: { anneeScolaire: true },
      orderBy: { dateDebut: 'asc' },
    });
    res.json(evenements);
  } catch (err) {
    next(err);
  }
}

async function creerEvenement(req, res, next) {
  try {
    const {
      anneeScolaireId,
      titre,
      description,
      dateDebut,
      dateFin,
      cible,
    } = req.body;
    if (!anneeScolaireId || !titre || !dateDebut) {
      return res.status(400).json({
        error: 'anneeScolaireId, titre et dateDebut sont requis',
      });
    }
    const annee = await prisma.anneeScolaire.findFirst({
      where: {
        id: anneeScolaireId,
        etablissementId: req.user.etablissementId,
      },
    });
    if (!annee) {
      return res.status(404).json({ error: 'Année scolaire introuvable' });
    }

    const debut = new Date(dateDebut);
    const fin = dateFin ? new Date(dateFin) : null;
    if (
      Number.isNaN(debut.getTime()) ||
      (fin && Number.isNaN(fin.getTime())) ||
      (fin && fin < debut)
    ) {
      return res.status(400).json({
        error: 'Les dates de l’événement sont invalides',
      });
    }

    const evenement = await prisma.evenementScolaire.create({
      data: {
        etablissementId: req.user.etablissementId,
        anneeScolaireId,
        titre: titre.trim(),
        description: description?.trim() || null,
        dateDebut: debut,
        dateFin: fin,
        cible: cible || 'TOUS',
      },
      include: { anneeScolaire: true },
    });
    res.status(201).json(evenement);
  } catch (err) {
    next(err);
  }
}

async function supprimerEvenement(req, res, next) {
  try {
    const evenement = await prisma.evenementScolaire.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!evenement) {
      return res.status(404).json({ error: 'Événement introuvable' });
    }
    await prisma.evenementScolaire.delete({ where: { id: evenement.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  obtenirProgramme,
  mettreAJourProgramme,
  obtenirCoefficientsPourNiveau,
  listerMatieresParNiveau,
  listerPlanifications,
  creerPlanification,
  modifierPlanification,
  supprimerPlanification,
  listerEvenements,
  creerEvenement,
  supprimerEvenement,
};