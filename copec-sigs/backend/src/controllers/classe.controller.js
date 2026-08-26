const prisma = require('../config/prisma');

// Toutes les requêtes sont automatiquement filtrées par l'établissement
// de l'utilisateur connecté (req.user.etablissementId) — jamais les deux
// sites (Isaha / Mangabe) ne doivent se mélanger.

async function lister(req, res, next) {
  try {
    const { anneeScolaireId } = req.query;

    const classes = await prisma.classe.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        ...(anneeScolaireId ? { anneeScolaireId } : {}),
      },
      include: {
        niveau: true,
        anneeScolaire: true,
        _count: { select: { inscriptions: true } },
      },
      orderBy: [{ niveau: { ordre: 'asc' } }, { nom: 'asc' }],
    });

    res.json(classes);
  } catch (err) {
    next(err);
  }
}

async function obtenirParId(req, res, next) {
  try {
    const classe = await prisma.classe.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
      include: {
        niveau: true,
        anneeScolaire: true,
        inscriptions: { include: { eleve: true } },
      },
    });

    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });
    res.json(classe);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { nom, niveauId, anneeScolaireId, enseignantPrincipal } = req.body;

    if (!nom || !niveauId || !anneeScolaireId) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (nom, niveauId, anneeScolaireId)' });
    }

    const classe = await prisma.classe.create({
      data: {
        etablissementId: req.user.etablissementId,
        nom,
        niveauId,
        anneeScolaireId,
        enseignantPrincipal,
      },
      include: { niveau: true },
    });

    res.status(201).json(classe);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Une classe avec ce nom existe déjà pour cette année scolaire' });
    }
    next(err);
  }
}

async function modifier(req, res, next) {
  try {
    // On vérifie d'abord que la classe appartient bien à l'établissement de l'utilisateur
    const existante = await prisma.classe.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!existante) return res.status(404).json({ error: 'Classe introuvable' });

    const { nom, niveauId, enseignantPrincipal } = req.body;

    const classe = await prisma.classe.update({
      where: { id: req.params.id },
      data: { nom, niveauId, enseignantPrincipal },
      include: { niveau: true },
    });

    res.json(classe);
  } catch (err) {
    next(err);
  }
}

async function supprimer(req, res, next) {
  try {
    const existante = await prisma.classe.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
      include: { _count: { select: { inscriptions: true } } },
    });
    if (!existante) return res.status(404).json({ error: 'Classe introuvable' });

    if (existante._count.inscriptions > 0) {
      return res.status(409).json({ error: 'Impossible de supprimer : des élèves sont inscrits dans cette classe' });
    }

    await prisma.classe.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, obtenirParId, creer, modifier, supprimer };