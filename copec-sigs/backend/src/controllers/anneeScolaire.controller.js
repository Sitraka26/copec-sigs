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

async function creer(req, res, next) {
  try {
    const { libelle, dateDebut, dateFin, activerMaintenant, copierBaremeDepuisAnneeId } = req.body;
    if (!libelle || !dateDebut || !dateFin) {
      return res.status(400).json({ error: 'libelle, dateDebut et dateFin sont requis' });
    }

    const anneeScolaire = await prisma.anneeScolaire.create({
      data: {
        etablissementId: req.user.etablissementId,
        libelle,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        active: false,
      },
    });

    if (copierBaremeDepuisAnneeId) {
      const baremesExistants = await prisma.baremeFrais.findMany({
        where: { anneeScolaireId: copierBaremeDepuisAnneeId },
      });
      if (baremesExistants.length > 0) {
        await prisma.baremeFrais.createMany({
          data: baremesExistants.map((b) => ({
            niveauId: b.niveauId,
            anneeScolaireId: anneeScolaire.id,
            droit: b.droit,
            ecolage: b.ecolage,
            fraisExamen: b.fraisExamen,
          })),
        });
      }
    }

    if (activerMaintenant) {
      await prisma.$transaction([
        prisma.anneeScolaire.updateMany({
          where: { etablissementId: req.user.etablissementId },
          data: { active: false },
        }),
        prisma.anneeScolaire.update({ where: { id: anneeScolaire.id }, data: { active: true } }),
      ]);
    }

    const resultat = await prisma.anneeScolaire.findUnique({ where: { id: anneeScolaire.id } });
    res.status(201).json(resultat);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Une année scolaire avec ce libellé existe déjà' });
    }
    next(err);
  }
}

async function activer(req, res, next) {
  try {
    const annee = await prisma.anneeScolaire.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!annee) return res.status(404).json({ error: 'Année scolaire introuvable' });

    await prisma.$transaction([
      prisma.anneeScolaire.updateMany({
        where: { etablissementId: req.user.etablissementId },
        data: { active: false },
      }),
      prisma.anneeScolaire.update({ where: { id: annee.id }, data: { active: true } }),
    ]);

    res.json({ message: `Année scolaire ${annee.libelle} activée` });
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, creer, activer };