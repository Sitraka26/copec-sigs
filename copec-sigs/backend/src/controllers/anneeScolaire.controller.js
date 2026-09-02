const prisma = require('../config/prisma');

async function lister(req, res, next) {
  try {
    const annees = await prisma.anneeScolaire.findMany({
      where: { etablissementId: req.user.etablissementId },
      orderBy: { dateDebut: 'desc' },
    });
    res.json(annees);
  } catch (err) {
    next(err);
  }
}

module.exports = { lister };