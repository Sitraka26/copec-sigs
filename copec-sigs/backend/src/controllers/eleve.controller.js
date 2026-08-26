const prisma = require('../config/prisma');

// Toutes les requêtes sont filtrées par l'établissement de l'utilisateur
// connecté (isolation multi-site : Isaha ne doit jamais voir les élèves
// de Mangabe, et inversement).

async function lister(req, res, next) {
  try {
    const eleves = await prisma.eleve.findMany({
      where: { etablissementId: req.user.etablissementId },
      orderBy: { nom: 'asc' },
    });
    res.json(eleves);
  } catch (err) {
    next(err);
  }
}

async function obtenirParId(req, res, next) {
  try {
    const eleve = await prisma.eleve.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
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
        etablissementId: req.user.etablissementId,
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
    const existant = await prisma.eleve.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!existant) return res.status(404).json({ error: 'Élève introuvable' });

    const { etablissementId, id, ...donneesModifiables } = req.body;

    const eleve = await prisma.eleve.update({
      where: { id: req.params.id },
      data: donneesModifiables,
    });
    res.json(eleve);
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, obtenirParId, creer, modifier };