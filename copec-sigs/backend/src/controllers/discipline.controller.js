const prisma = require('../config/prisma');

async function lister(req, res, next) {
  try {
    const { eleveId } = req.query;
    const where = {
      etablissementId: req.user.etablissementId,
      ...(eleveId ? { eleveId } : {}),
    };

    const disciplines = await prisma.discipline.findMany({
      where,
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
        auteur: { select: { id: true, nom: true, prenom: true, role: true } },
      },
      orderBy: { dateIncident: 'desc' },
      take: 100,
    });

    res.json(disciplines);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { eleveId, type, motif, description, dateIncident, points } = req.body;

    if (!eleveId || !type || !motif) {
      return res.status(400).json({ error: 'eleveId, type et motif sont requis' });
    }

    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });

    const discipline = await prisma.discipline.create({
      data: {
        etablissementId: req.user.etablissementId,
        eleveId,
        auteurId: req.user.id,
        type,
        motif,
        description: description || null,
        dateIncident: dateIncident ? new Date(dateIncident) : new Date(),
        points: points !== undefined ? Number(points) : 0,
      },
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
        auteur: { select: { id: true, nom: true, prenom: true, role: true } },
      },
    });

    // Audit
    try {
      const { enregistrerAudit } = require('../services/audit.service');
      await enregistrerAudit({
        etablissementId: req.user.etablissementId,
        utilisateurId: req.user.id,
        action: 'CREATE_DISCIPLINE',
        entite: 'Discipline',
        entiteId: discipline.id,
        details: { type, motif, eleve: `${eleve.prenom} ${eleve.nom}` },
        ip: req.ip,
      });
    } catch (_) {}

    res.status(201).json(discipline);
  } catch (err) {
    next(err);
  }
}

async function supprimer(req, res, next) {
  try {
    const existant = await prisma.discipline.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!existant) return res.status(404).json({ error: 'Entrée introuvable' });

    await prisma.discipline.delete({ where: { id: existant.id } });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    next(err);
  }
}

async function resumeEleve(req, res, next) {
  try {
    const { eleveId } = req.params;

    const entries = await prisma.discipline.findMany({
      where: { eleveId, etablissementId: req.user.etablissementId },
      orderBy: { dateIncident: 'desc' },
    });

    const totalPoints = entries.reduce((acc, e) => acc + e.points, 0);
    const nbSanctions = entries.filter((e) =>
      ['AVERTISSEMENT', 'BLAME', 'EXCLUSION_TEMPORAIRE', 'OBSERVATION_NEGATIVE'].includes(e.type)
    ).length;
    const nbPositives = entries.filter((e) => e.type === 'OBSERVATION_POSITIVE').length;

    res.json({ totalPoints, nbSanctions, nbPositives, entries });
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, creer, supprimer, resumeEleve };