const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function login(req, res, next) {
  try {
    const { email, motDePasse } = req.body;
    if (!email || !motDePasse) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
    if (!utilisateur || !utilisateur.actif) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const valide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!valide) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: utilisateur.id, role: utilisateur.role, nom: utilisateur.nom, etablissementId: utilisateur.etablissementId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        role: utilisateur.role,
        etablissementId: utilisateur.etablissementId,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function changerMotDePasse(req, res, next) {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;
    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({ error: 'Ancien et nouveau mot de passe requis' });
    }
    if (nouveauMotDePasse.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.user.id } });
    if (!utilisateur) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const valide = await bcrypt.compare(ancienMotDePasse, utilisateur.motDePasse);
    if (!valide) return res.status(401).json({ error: 'Ancien mot de passe incorrect' });

    const nouveauHash = await bcrypt.hash(nouveauMotDePasse, 10);
    await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { motDePasse: nouveauHash } });

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, changerMotDePasse };