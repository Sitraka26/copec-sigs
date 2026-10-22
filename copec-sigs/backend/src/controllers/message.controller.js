const prisma = require('../config/prisma');

const LIBELLES_ROLE = {
  ADMIN: 'Administrateurs',
  DIRECTEUR: 'Direction',
  SECRETAIRE: 'Secrétariat',
  ECONOME: 'Économat',
  ENSEIGNANT: 'Tous les enseignants',
  SURVEILLANT: 'Surveillants',
};

const selectExpediteur = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  role: true,
};

function estLuPar(message, utilisateurId) {
  const ids = message.luParUtilisateurIds || [];
  return ids.includes(utilisateurId);
}

/** GET /api/messages — messages reçus */
async function listerRecus(req, res, next) {
  try {
    const messages = await prisma.message.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        OR: [
          { destinataireId: req.user.id },
          {
            destinataireRole: req.user.role,
            destinataireId: null,
          },
        ],
      },
      include: {
        expediteur: { select: selectExpediteur },
      },
      orderBy: { dateEnvoi: 'desc' },
    });

    const formates = messages.map((m) => ({
      id: m.id,
      contenu: m.contenu,
      dateEnvoi: m.dateEnvoi,
      lu: estLuPar(m, req.user.id),
      cibleTout: !m.destinataireId && !!m.destinataireRole,
      cible: m.destinataireId
        ? 'Message personnel'
        : LIBELLES_ROLE[m.destinataireRole] || m.destinataireRole,
      expediteur: m.expediteur,
    }));

    res.json(formates);
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/envoyes */
async function listerEnvoyes(req, res, next) {
  try {
    const messages = await prisma.message.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        expediteurId: req.user.id,
      },
      include: {
        destinataire: {
          select: { id: true, nom: true, prenom: true, role: true },
        },
      },
      orderBy: { dateEnvoi: 'desc' },
    });

    const formates = messages.map((m) => ({
      id: m.id,
      contenu: m.contenu,
      dateEnvoi: m.dateEnvoi,
      cible: m.destinataire
        ? `${m.destinataire.prenom} ${m.destinataire.nom}`
        : LIBELLES_ROLE[m.destinataireRole] || m.destinataireRole || '—',
      nombreLectures: (m.luParUtilisateurIds || []).length,
      expediteur: {
        id: req.user.id,
        nom: req.user.nom,
        prenom: req.user.prenom,
        role: req.user.role,
      },
    }));

    res.json(formates);
  } catch (err) {
    next(err);
  }
}

/** POST /api/messages */
async function envoyer(req, res, next) {
  try {
    const { contenu, destinataireId, destinataireRole } = req.body;

    if (!contenu || !String(contenu).trim()) {
      return res.status(400).json({ error: 'Le contenu du message est requis' });
    }
    if (!destinataireId && !destinataireRole) {
      return res.status(400).json({ error: 'Destinataire requis (personne ou poste)' });
    }

    if (destinataireId) {
      const dest = await prisma.utilisateur.findFirst({
        where: {
          id: destinataireId,
          etablissementId: req.user.etablissementId,
          actif: true,
        },
      });
      if (!dest) {
        return res.status(404).json({ error: 'Destinataire introuvable' });
      }
    }

    // Ne pas s'envoyer un message à soi-même en mode personne
    if (destinataireId && destinataireId === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer un message' });
    }

    const message = await prisma.message.create({
      data: {
        etablissementId: req.user.etablissementId,
        expediteurId: req.user.id,
        contenu: String(contenu).trim(),
        destinataireId: destinataireId || null,
        destinataireRole: destinataireId ? null : destinataireRole,
        luParUtilisateurIds: [],
      },
      include: {
        expediteur: { select: selectExpediteur },
      },
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/messages/:id/lu */
async function marquerLu(req, res, next) {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: req.params.id,
        etablissementId: req.user.etablissementId,
        OR: [
          { destinataireId: req.user.id },
          { destinataireRole: req.user.role, destinataireId: null },
        ],
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message introuvable' });
    }

    const deja = message.luParUtilisateurIds || [];
    if (!deja.includes(req.user.id)) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          luParUtilisateurIds: { push: req.user.id },
        },
      });
    }

    res.json({ message: 'Message marqué comme lu' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/non-lus/nombre */
async function nombreNonLus(req, res, next) {
  try {
    const messages = await prisma.message.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        OR: [
          { destinataireId: req.user.id },
          { destinataireRole: req.user.role, destinataireId: null },
        ],
      },
      select: { luParUtilisateurIds: true },
    });

    const nombre = messages.filter((m) => !estLuPar(m, req.user.id)).length;
    res.json({ nombre });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listerRecus,
  listerEnvoyes,
  envoyer,
  marquerLu,
  nombreNonLus,
};