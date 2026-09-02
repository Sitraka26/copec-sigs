const prisma = require('../config/prisma');

/**
 * GET /api/niveaux/:id/programme
 * Retourne toutes les matières avec leur coefficient pour ce niveau précis.
 * Si aucun coefficient spécifique n'a été défini pour une matière à ce
 * niveau, le coefficient par défaut de la Matiere est utilisé (repli).
 */
async function obtenirProgramme(req, res, next) {
  try {
    const niveau = await prisma.niveau.findUnique({ where: { id: req.params.id } });
    if (!niveau) return res.status(404).json({ error: 'Niveau introuvable' });

    const matieres = await prisma.matiere.findMany({
      where: { etablissementId: req.user.etablissementId },
      orderBy: { nom: 'asc' },
    });

    const overrides = await prisma.niveauMatiere.findMany({
      where: { niveauId: niveau.id },
    });
    const overrideParMatiere = {};
    overrides.forEach((o) => (overrideParMatiere[o.matiereId] = o.coefficient));

    const programme = matieres.map((m) => ({
      matiereId: m.id,
      nom: m.nom,
      coefficient: overrideParMatiere[m.id] ?? m.coefficient,
      personnalise: overrideParMatiere[m.id] !== undefined,
    }));

    res.json({ niveau, programme });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/niveaux/:id/programme
 * Body: { matieres: [{ matiereId, coefficient }] }
 * Définit/écrase les coefficients spécifiques à ce niveau.
 */
async function mettreAJourProgramme(req, res, next) {
  try {
    const { matieres } = req.body;
    if (!Array.isArray(matieres)) {
      return res.status(400).json({ error: 'matieres doit être un tableau' });
    }

    const niveau = await prisma.niveau.findUnique({ where: { id: req.params.id } });
    if (!niveau) return res.status(404).json({ error: 'Niveau introuvable' });

    for (const m of matieres) {
      if (typeof m.coefficient !== 'number' || m.coefficient <= 0) {
        return res.status(400).json({ error: `Coefficient invalide pour la matière ${m.matiereId}` });
      }
    }

    await prisma.$transaction(
      matieres.map((m) =>
        prisma.niveauMatiere.upsert({
          where: { niveauId_matiereId: { niveauId: niveau.id, matiereId: m.matiereId } },
          update: { coefficient: m.coefficient },
          create: { niveauId: niveau.id, matiereId: m.matiereId, coefficient: m.coefficient },
        })
      )
    );

    res.json({ message: 'Programme mis à jour' });
  } catch (err) {
    next(err);
  }
}

/**
 * Fonction utilitaire réutilisée par le module Bulletin :
 * renvoie une map { matiereId: coefficient } pour un niveau donné,
 * avec repli sur le coefficient par défaut de chaque matière.
 */
async function obtenirCoefficientsPourNiveau(niveauId, etablissementId) {
  const matieres = await prisma.matiere.findMany({ where: { etablissementId } });
  const overrides = await prisma.niveauMatiere.findMany({ where: { niveauId } });
  const overrideParMatiere = {};
  overrides.forEach((o) => (overrideParMatiere[o.matiereId] = o.coefficient));

  const map = {};
  matieres.forEach((m) => {
    map[m.id] = overrideParMatiere[m.id] ?? m.coefficient;
  });
  return map;
}

module.exports = { obtenirProgramme, mettreAJourProgramme, obtenirCoefficientsPourNiveau };