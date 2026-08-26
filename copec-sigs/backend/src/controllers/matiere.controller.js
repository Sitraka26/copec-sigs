const prisma = require('../config/prisma');

async function lister(req, res, next) {
  try {
    const matieres = await prisma.matiere.findMany({
      where: { etablissementId: req.user.etablissementId },
      orderBy: { nom: 'asc' },
    });
    res.json(matieres);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { nom, coefficient } = req.body;
    if (!nom) return res.status(400).json({ error: 'Le nom de la matière est requis' });

    const matiere = await prisma.matiere.create({
      data: {
        etablissementId: req.user.etablissementId,
        nom,
        coefficient: coefficient ?? 1,
      },
    });
    res.status(201).json(matiere);
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, creer };