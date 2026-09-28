const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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

const motDePasseTemporaire = crypto.randomBytes(6).toString('base64url'); // ex: "aZ3f-Qk2"
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
/**
 * PATCH /api/enseignants/:id/matieres
 * Remplace complètement la liste des matières qu'un enseignant est habilité
 * à enseigner (utile pour corriger/mettre à jour après la création initiale).
 */
async function assignerMatieres(req, res, next) {
  try {
    const { matiereIds } = req.body;
    if (!Array.isArray(matiereIds)) {
      return res.status(400).json({ error: 'matiereIds doit être un tableau' });
    }

    const enseignant = await prisma.enseignant.findFirst({
      where: { id: req.params.id, utilisateur: { etablissementId: req.user.etablissementId } },
    });
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    await prisma.$transaction([
      prisma.enseignantMatiere.deleteMany({ where: { enseignantId: enseignant.id } }),
      prisma.enseignantMatiere.createMany({
        data: matiereIds.map((matiereId) => ({ enseignantId: enseignant.id, matiereId })),
      }),
    ]);

    const enseignantMisAJour = await prisma.enseignant.findUnique({
      where: { id: enseignant.id },
      include: { utilisateur: true, matieres: { include: { matiere: true } } },
    });

    res.json(enseignantMisAJour);
  } catch (err) {
    next(err);
  }
}

async function mettreAJour(req, res, next) {
  try {
    const { nom, prenom, email, telephone } = req.body;
    const enseignant = await prisma.enseignant.findFirst({
      where: { id: req.params.id, utilisateur: { etablissementId: req.user.etablissementId } },
      include: { utilisateur: true },
    });
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    // Met à jour l'utilisateur lié (nom/prenom/email) et le profil enseignant (telephone)
    if (nom || prenom || email) {
      try {
        await prisma.utilisateur.update({
          where: { id: enseignant.utilisateurId },
          data: { nom, prenom, email },
        });
      } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
        throw err;
      }
    }

    const enseignantMisAJour = await prisma.enseignant.update({
      where: { id: enseignant.id },
      data: { telephone },
      include: { utilisateur: true, matieres: { include: { matiere: true } } },
    });

    res.json(enseignantMisAJour);
  } catch (err) {
    next(err);
  }
}

async function supprimer(req, res, next) {
  try {
    const enseignant = await prisma.enseignant.findFirst({
      where: { id: req.params.id, utilisateur: { etablissementId: req.user.etablissementId } },
      include: { utilisateur: true },
    });
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    // Empêche la suppression si l'enseignant a des créneaux d'emploi du temps
    const seances = await prisma.seance.count({ where: { enseignantId: enseignant.id } });
    if (seances > 0) return res.status(400).json({ error: 'Impossible de supprimer: l\'enseignant a des créneaux d\'emploi du temps' });

    await prisma.$transaction([
      prisma.enseignantMatiere.deleteMany({ where: { enseignantId: enseignant.id } }),
      prisma.enseignant.delete({ where: { id: enseignant.id } }),
      prisma.utilisateur.delete({ where: { id: enseignant.utilisateurId } }),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function reinitialiserMotDePasse(req, res, next) {
  try {
    const enseignant = await prisma.enseignant.findFirst({
      where: { id: req.params.id, utilisateur: { etablissementId: req.user.etablissementId } },
      include: { utilisateur: true },
    });
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    const motDePasseTemporaire = crypto.randomBytes(6).toString('base64url');
    const motDePasseHash = await bcrypt.hash(motDePasseTemporaire, 10);

    await prisma.utilisateur.update({ where: { id: enseignant.utilisateurId }, data: { motDePasse: motDePasseHash } });

    // Retourne le mot de passe temporaire pour l'afficher une seule fois côté admin
    res.json({ motDePasseTemporaire });
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, creer, assignerMatieres, mettreAJour, supprimer, reinitialiserMotDePasse };

