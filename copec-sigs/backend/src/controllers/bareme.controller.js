const prisma = require('../config/prisma');

/**
 * GET /api/baremes?anneeScolaireId=
 * Liste le barème de frais complet (droit, écolage, frais examen) pour
 * chaque niveau, pour une année scolaire donnée.
 */
async function lister(req, res, next) {
  try {
    const { anneeScolaireId } = req.query;
    if (!anneeScolaireId) return res.status(400).json({ error: 'anneeScolaireId requis' });

    const annee = await prisma.anneeScolaire.findFirst({
      where: { id: anneeScolaireId, etablissementId: req.user.etablissementId },
    });
    if (!annee) return res.status(404).json({ error: 'Année scolaire introuvable' });

    const baremes = await prisma.baremeFrais.findMany({
      where: { anneeScolaireId },
      include: { niveau: true },
      orderBy: { niveau: { ordre: 'asc' } },
    });

    res.json(baremes);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/baremes
 * Body: { anneeScolaireId, baremes: [{ niveauId, droit, ecolage, fraisExamen }] }
 * Met à jour (ou crée) le barème de frais pour plusieurs niveaux d'un coup.
 */
async function mettreAJour(req, res, next) {
  try {
    const { anneeScolaireId, baremes } = req.body;
    if (!anneeScolaireId || !Array.isArray(baremes)) {
      return res.status(400).json({ error: 'anneeScolaireId et baremes[] sont requis' });
    }

    const annee = await prisma.anneeScolaire.findFirst({
      where: { id: anneeScolaireId, etablissementId: req.user.etablissementId },
    });
    if (!annee) return res.status(404).json({ error: 'Année scolaire introuvable' });

    for (const b of baremes) {
      if (
        typeof b.droit !== 'number' || b.droit < 0 ||
        typeof b.ecolage !== 'number' || b.ecolage < 0 ||
        typeof b.fraisExamen !== 'number' || b.fraisExamen < 0
      ) {
        return res.status(400).json({ error: `Montants invalides pour le niveau ${b.niveauId}` });
      }
    }

    await prisma.$transaction(
      baremes.map((b) =>
        prisma.baremeFrais.upsert({
          where: { niveauId_anneeScolaireId: { niveauId: b.niveauId, anneeScolaireId } },
          update: { droit: b.droit, ecolage: b.ecolage, fraisExamen: b.fraisExamen },
          create: {
            niveauId: b.niveauId,
            anneeScolaireId,
            droit: b.droit,
            ecolage: b.ecolage,
            fraisExamen: b.fraisExamen,
          },
        })
      )
    );

    res.json({ message: 'Barème mis à jour' });
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, mettreAJour };