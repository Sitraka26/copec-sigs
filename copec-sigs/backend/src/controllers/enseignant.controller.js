const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

async function lister(req, res, next) {
  try {
    const enseignants = await prisma.enseignant.findMany({
      where: { utilisateur: { etablissementId: req.user.etablissementId } },
      include: { utilisateur: true, matieres: { include: { matiere: true } } },
      orderBy: { utilisateur: { nom: 'asc' } },
    });
    res.json(enseignants);
  } catch (err) {
    next(err);
  }
}

/**
 * Crée un compte enseignant : un Utilisateur (role ENSEIGNANT) + son profil
 * Enseignant, avec un mot de passe temporaire simple à communiquer.
 */
async function creer(req, res, next) {
  try {
    const { nom, prenom, email, telephone, matiereIds } = req.body;
    if (!nom || !prenom || !email) {
      return res.status(400).json({ error: 'nom, prenom et email sont requis' });
    }

    const motDePasseTemporaire = 'copec' + Math.floor(1000 + Math.random() * 9000);
    const motDePasseHash = await bcrypt.hash(motDePasseTemporaire, 10);

    const utilisateur = await prisma.utilisateur.create({
      data: {
        etablissementId: req.user.etablissementId,
        nom,
        prenom,
        email,
        motDePasse: motDePasseHash,
        role: 'ENSEIGNANT',
      },
    });

    const enseignant = await prisma.enseignant.create({
      data: { utilisateurId: utilisateur.id, telephone },
    });

    if (Array.isArray(matiereIds) && matiereIds.length > 0) {
      await prisma.enseignantMatiere.createMany({
        data: matiereIds.map((matiereId) => ({ enseignantId: enseignant.id, matiereId })),
      });
    }

    res.status(201).json({
      enseignant,
      utilisateur: { id: utilisateur.id, nom, prenom, email },
      motDePasseTemporaire, // affiché une seule fois, à communiquer à l'enseignant
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }
    next(err);
  }
}

module.exports = { lister, creer };