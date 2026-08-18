const prisma = require('../config/prisma');

async function lister(req, res, next) {
  try {
    const eleves = await prisma.eleve.findMany({
      orderBy: { nom: 'asc' },
    });
    res.json(eleves);
  } catch (err) {
    next(err);
  }
}

async function obtenirParId(req, res, next) {
  try {
    const eleve = await prisma.eleve.findUnique({
      where: { id: req.params.id },
      include: { inscriptions: { include: { classe: true } } },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });
    res.json(eleve);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { matricule, nom, prenom, dateNaissance, sexe, adresse, contactUrgenceNom, contactUrgenceTel } = req.body;
    if (!matricule || !nom || !prenom || !dateNaissance || !sexe) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (matricule, nom, prenom, dateNaissance, sexe)' });
    }

    const eleve = await prisma.eleve.create({
      data: {
        matricule,
        nom,
        prenom,
        dateNaissance: new Date(dateNaissance),
        sexe,
        adresse,
        contactUrgenceNom,
        contactUrgenceTel,
      },
    });
    res.status(201).json(eleve);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ce matricule existe déjà' });
    }
    next(err);
  }
}

async function modifier(req, res, next) {
  try {
    const eleve = await prisma.eleve.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(eleve);
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, obtenirParId, creer, modifier };
