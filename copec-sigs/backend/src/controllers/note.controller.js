const prisma = require('../config/prisma');

const PERIODE_MIN = 1;
const PERIODE_MAX = 5; // 5 bimestres, confirmé avec l'école

function periodeValide(periode) {
  const p = Number(periode);
  return Number.isInteger(p) && p >= PERIODE_MIN && p <= PERIODE_MAX;
}

/**
 * GET /api/notes/saisie?classeId=&matiereId=&periode=
 * Retourne la liste des élèves inscrits dans la classe, avec leur note
 * existante pour cette matière/période (ou null si pas encore saisie).
 * C'est la vue "grille" qu'un enseignant utilise pour remplir les notes.
 */
async function listerPourSaisie(req, res, next) {
  try {
    const { classeId, matiereId, periode } = req.query;

    if (!classeId || !matiereId || !periode) {
      return res.status(400).json({ error: 'classeId, matiereId et periode sont requis' });
    }
    if (!periodeValide(periode)) {
      return res.status(400).json({ error: `periode doit être entre ${PERIODE_MIN} et ${PERIODE_MAX}` });
    }

    // Vérifie que la classe et la matière appartiennent à l'établissement de l'utilisateur
    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const matiere = await prisma.matiere.findFirst({
      where: { id: matiereId, etablissementId: req.user.etablissementId },
    });
    if (!matiere) return res.status(404).json({ error: 'Matière introuvable' });

    const inscriptions = await prisma.inscription.findMany({
      where: { classeId, statut: 'ACTIVE' },
      include: {
        eleve: {
          include: {
            notes: { where: { matiereId, periode: Number(periode) } },
          },
        },
      },
      orderBy: { eleve: { nom: 'asc' } },
    });

    const grille = inscriptions.map((insc) => ({
      eleveId: insc.eleve.id,
      matricule: insc.eleve.matricule,
      nom: insc.eleve.nom,
      prenom: insc.eleve.prenom,
      note: insc.eleve.notes[0]?.valeur ?? null,
      noteId: insc.eleve.notes[0]?.id ?? null,
    }));

    res.json({ matiere, periode: Number(periode), coefficient: matiere.coefficient, eleves: grille });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notes/saisie
 * Body: { classeId, matiereId, periode, notes: [{ eleveId, valeur }] }
 * Enregistre (ou met à jour) les notes de toute une classe en une seule fois.
 */
async function enregistrerLot(req, res, next) {
  try {
    const { classeId, matiereId, periode, notes } = req.body;

    if (!classeId || !matiereId || !periode || !Array.isArray(notes)) {
      return res.status(400).json({ error: 'classeId, matiereId, periode et notes[] sont requis' });
    }
    if (!periodeValide(periode)) {
      return res.status(400).json({ error: `periode doit être entre ${PERIODE_MIN} et ${PERIODE_MAX}` });
    }

    // Vérifications d'appartenance (sécurité multi-site)
    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const matiere = await prisma.matiere.findFirst({
      where: { id: matiereId, etablissementId: req.user.etablissementId },
    });
    if (!matiere) return res.status(404).json({ error: 'Matière introuvable' });

    // Valide chaque note avant d'écrire quoi que ce soit
    for (const n of notes) {
      if (typeof n.valeur !== 'number' || n.valeur < 0 || n.valeur > 20) {
        return res.status(400).json({ error: `Note invalide pour l'élève ${n.eleveId} : doit être entre 0 et 20` });
      }
    }

    // Vérifie que tous les élèves concernés sont bien inscrits dans cette classe
    const eleveIds = notes.map((n) => n.eleveId);
    const inscriptionsValides = await prisma.inscription.findMany({
      where: { classeId, eleveId: { in: eleveIds }, statut: 'ACTIVE' },
      select: { eleveId: true },
    });
    const idsValides = new Set(inscriptionsValides.map((i) => i.eleveId));
    const idsInvalides = eleveIds.filter((id) => !idsValides.has(id));
    if (idsInvalides.length > 0) {
      return res.status(400).json({ error: `Élève(s) non inscrit(s) dans cette classe : ${idsInvalides.join(', ')}` });
    }

    // Upsert de chaque note (met à jour si elle existe déjà pour eleve+matiere+periode, sinon crée)
    const resultats = await prisma.$transaction(
      notes.map((n) =>
        prisma.note.upsert({
          where: {
            // nécessite une contrainte unique (eleveId, matiereId, periode) — voir note ci-dessous
            eleveId_matiereId_periode: { eleveId: n.eleveId, matiereId, periode: Number(periode) },
          },
          update: { valeur: n.valeur, date: new Date() },
          create: { eleveId: n.eleveId, matiereId, periode: Number(periode), valeur: n.valeur },
        })
      )
    );

    res.json({ enregistrees: resultats.length, notes: resultats });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notes/eleve/:eleveId?periode=
 * Toutes les notes d'un élève (utilisé plus tard pour générer le bulletin).
 */
async function listerParEleve(req, res, next) {
  try {
    const { periode } = req.query;

    const eleve = await prisma.eleve.findFirst({
      where: { id: req.params.eleveId, etablissementId: req.user.etablissementId },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });

    const notes = await prisma.note.findMany({
      where: {
        eleveId: req.params.eleveId,
        ...(periode ? { periode: Number(periode) } : {}),
      },
      include: { matiere: true },
      orderBy: [{ periode: 'asc' }, { matiere: { nom: 'asc' } }],
    });

    res.json(notes);
  } catch (err) {
    next(err);
  }
}

module.exports = { listerPourSaisie, enregistrerLot, listerParEleve };