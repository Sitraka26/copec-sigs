const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');

const ROLES_CREABLES = ['DIRECTEUR', 'SECRETAIRE', 'ECONOME', 'SURVEILLANT', 'ADMIN'];

async function lister(req, res, next) {
  try {
    const utilisateurs = await prisma.utilisateur.findMany({
      where: { etablissementId: req.user.etablissementId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        actif: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { nom: 'asc' }],
    });
    res.json(utilisateurs);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { nom, prenom, email, role, telephone } = req.body;

    if (!nom || !prenom || !email || !role) {
      return res.status(400).json({ error: 'nom, prenom, email et role sont requis' });
    }
    if (!ROLES_CREABLES.includes(role)) {
      return res.status(400).json({
        error: `Rôle invalide. Autorisés : ${ROLES_CREABLES.join(', ')}`,
      });
    }

    const emailNormalise = String(email).trim().toLowerCase();
    const existant = await prisma.utilisateur.findUnique({ where: { email: emailNormalise } });
    if (existant) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const motDePasseTemporaire = crypto.randomBytes(6).toString('base64url');
    const hash = await bcrypt.hash(motDePasseTemporaire, 10);

    const utilisateur = await prisma.utilisateur.create({
      data: {
        etablissementId: req.user.etablissementId,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: emailNormalise,
        motDePasse: hash,
        role,
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        actif: true,
        createdAt: true,
      },
    });

    // Optionnel : journal d'audit si tu as le service
    try {
      const { enregistrerAudit } = require('../services/audit.service');
      await enregistrerAudit({
        etablissementId: req.user.etablissementId,
        utilisateurId: req.user.id,
        action: 'CREATE_UTILISATEUR',
        entite: 'Utilisateur',
        entiteId: utilisateur.id,
        details: { email: utilisateur.email, role: utilisateur.role },
        ip: req.ip,
      });
    } catch (_) {}

    res.status(201).json({
      utilisateur,
      motDePasseTemporaire,
      message: 'Compte créé. Communiquez le mot de passe temporaire à la personne.',
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    next(err);
  }
}

async function reinitialiserMotDePasse(req, res, next) {
  try {
    const utilisateur = await prisma.utilisateur.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const motDePasseTemporaire = crypto.randomBytes(6).toString('base64url');
    const hash = await bcrypt.hash(motDePasseTemporaire, 10);

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { motDePasse: hash },
    });

    res.json({ motDePasseTemporaire });
  } catch (err) {
    next(err);
  }
}

async function changerActif(req, res, next) {
  try {
    const utilisateur = await prisma.utilisateur.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    if (utilisateur.id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' });
    }

    const misAJour = await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { actif: !utilisateur.actif },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        actif: true,
      },
    });

    res.json(misAJour);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  lister,
  creer,
  reinitialiserMotDePasse,
  changerActif,
};