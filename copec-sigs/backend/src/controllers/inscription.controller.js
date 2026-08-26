const prisma = require('../config/prisma');

// Une Inscription relie un Eleve à une Classe pour une AnneeScolaire donnée.
// Contrôles de sécurité : la classe ET l'élève doivent appartenir au même
// établissement que l'utilisateur connecté (isolation multi-site).

async function lister(req, res, next) {
  try {
    const { classeId, anneeScolaireId, statut } = req.query;

    const inscriptions = await prisma.inscription.findMany({
      where: {
        classe: { etablissementId: req.user.etablissementId },
        ...(classeId ? { classeId } : {}),
        ...(anneeScolaireId ? { anneeScolaireId } : {}),
        ...(statut ? { statut } : {}),
      },
      include: {
        eleve: true,
        classe: { include: { niveau: true } },
        anneeScolaire: true,
      },
      orderBy: { eleve: { nom: 'asc' } },
    });

    res.json(inscriptions);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { eleveId, classeId, anneeScolaireId } = req.body;

    if (!eleveId || !classeId || !anneeScolaireId) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (eleveId, classeId, anneeScolaireId)' });
    }

    // Vérifie que l'élève appartient bien à l'établissement de l'utilisateur
    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable dans cet établissement' });

    // Vérifie que la classe appartient bien à l'établissement de l'utilisateur
    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable dans cet établissement' });

    const inscription = await prisma.inscription.create({
      data: { eleveId, classeId, anneeScolaireId },
      include: { eleve: true, classe: { include: { niveau: true } } },
    });

    res.status(201).json(inscription);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Cet élève est déjà inscrit pour cette année scolaire' });
    }
    next(err);
  }
}

async function modifierStatut(req, res, next) {
  try {
    const { statut } = req.body;
    const statutsValides = ['ACTIVE', 'TRANSFEREE', 'ABANDONNEE', 'DIPLOMEE'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs possibles : ${statutsValides.join(', ')}` });
    }

    const existante = await prisma.inscription.findFirst({
      where: { id: req.params.id, classe: { etablissementId: req.user.etablissementId } },
    });
    if (!existante) return res.status(404).json({ error: 'Inscription introuvable' });

    const inscription = await prisma.inscription.update({
      where: { id: req.params.id },
      data: { statut },
      include: { eleve: true, classe: true },
    });

    res.json(inscription);
  } catch (err) {
    next(err);
  }
}

async function changerClasse(req, res, next) {
  try {
    const { classeId } = req.body;
    if (!classeId) return res.status(400).json({ error: 'classeId requis' });

    const existante = await prisma.inscription.findFirst({
      where: { id: req.params.id, classe: { etablissementId: req.user.etablissementId } },
    });
    if (!existante) return res.status(404).json({ error: 'Inscription introuvable' });

    const nouvelleClasse = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!nouvelleClasse) return res.status(404).json({ error: 'Classe cible introuvable dans cet établissement' });

    const inscription = await prisma.inscription.update({
      where: { id: req.params.id },
      data: { classeId },
      include: { eleve: true, classe: { include: { niveau: true } } },
    });

    res.json(inscription);
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, creer, modifierStatut, changerClasse };