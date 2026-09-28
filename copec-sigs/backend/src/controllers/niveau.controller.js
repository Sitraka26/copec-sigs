const prisma = require('../config/prisma');

async function lister(req, res, next) {
  try {
    const niveaux = await prisma.niveau.findMany({ orderBy: { ordre: 'asc' } });
    res.json(niveaux);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { libelle, cycle, filiere, ordre } = req.body;
    if (!libelle || !cycle) {
      return res.status(400).json({ error: 'libelle et cycle sont requis' });
    }
    const cyclesValides = ['PRESCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'];
    if (!cyclesValides.includes(cycle)) {
      return res.status(400).json({ error: `cycle doit être l'un de : ${cyclesValides.join(', ')}` });
    }

    const dernierNiveau = await prisma.niveau.findFirst({ orderBy: { ordre: 'desc' } });
    const ordreCalcule = ordre === undefined || ordre === null || Number.isNaN(Number(ordre))
      ? (dernierNiveau?.ordre || 0) + 1
      : Number(ordre);
    if (!Number.isInteger(ordreCalcule) || ordreCalcule < 1) {
      return res.status(400).json({ error: 'ordre doit être un entier positif' });
    }

    const niveau = await prisma.niveau.create({
      data: { libelle: libelle.trim(), cycle, filiere: filiere?.trim() || null, ordre: ordreCalcule },
    });
    res.status(201).json(niveau);
  } catch (err) {
    next(err);
  }
}

async function modifier(req, res, next) {
  try {
    const existant = await prisma.niveau.findUnique({ where: { id: req.params.id } });
    if (!existant) return res.status(404).json({ error: 'Niveau introuvable' });

    const { libelle, cycle, filiere, ordre } = req.body;
    const niveau = await prisma.niveau.update({
      where: { id: req.params.id },
      data: {
        ...(libelle !== undefined ? { libelle } : {}),
        ...(cycle !== undefined ? { cycle } : {}),
        ...(filiere !== undefined ? { filiere } : {}),
        ...(ordre !== undefined ? { ordre: Number(ordre) } : {}),
      },
    });
    res.json(niveau);
  } catch (err) {
    next(err);
  }
}

async function supprimer(req, res, next) {
  try {
    const { id } = req.params;
    const existant = await prisma.niveau.findUnique({ where: { id } });
    if (!existant) return res.status(404).json({ error: 'Niveau introuvable' });

    const classesUtilisantNiveau = await prisma.classe.count({ where: { niveauId: id } });
    if (classesUtilisantNiveau > 0) {
      return res.status(400).json({ error: `Impossible de supprimer ce niveau : ${classesUtilisantNiveau} classe(s) l'utilisent.` });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.niveau.delete({ where: { id } });
      const niveauxRestants = await transaction.niveau.findMany({
        orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
        select: { id: true },
      });
      for (const [index, niveau] of niveauxRestants.entries()) {
        await transaction.niveau.update({ where: { id: niveau.id }, data: { ordre: index + 1 } });
      }
    });
    res.json({ message: 'Niveau supprimé et ordre réinitialisé automatiquement' });
  } catch (err) {
    next(err);
  }
}

async function reordonner(req, res, next) {
  try {
    const niveaux = await prisma.niveau.findMany({
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
      select: { id: true },
    });
    await prisma.$transaction(async (transaction) => {
      for (const [index, niveau] of niveaux.entries()) {
        await transaction.niveau.update({ where: { id: niveau.id }, data: { ordre: index + 1 } });
      }
    });
    res.json({ message: 'Ordre des niveaux réinitialisé', total: niveaux.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, creer, modifier, supprimer, reordonner };