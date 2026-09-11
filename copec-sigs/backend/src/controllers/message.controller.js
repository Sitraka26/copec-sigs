const prisma = require('../config/prisma');

async function lister(req, res, next) {
  try {
    const messages = await prisma.message.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        OR: [
          { destinataireId: req.user.id },
          { destinataireRole: req.user.role },
        ],
      },
      include: { expediteur: true },
      orderBy: { dateEnvoi: 'desc' },
    });

    const messagesAvecStatut = messages.map((m) => ({
      id: m.id,
      contenu: m.contenu,
      dateEnvoi: m.dateEnvoi,
      expediteur: { nom: m.expediteur.nom, prenom: m.expediteur.prenom, role: m.expediteur.role },
      cibleTout: !!m.destinataireRole,
      lu: m.luParUtilisateurIds.includes(req.user.id),
    }));

    res.json(messagesAvecStatut);
  } catch (err) {
    next(err);
  }
}

async function compterNonLus(req, res, next) {
  try {
    const messages = await prisma.message.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        OR: [
          { destinataireId: req.user.id },
          { destinataireRole: req.user.role },
        ],
      },
      select: { luParUtilisateurIds: true },
    });

    const nonLus = messages.filter((m) => !m.luParUtilisateurIds.includes(req.user.id)).length;
    res.json({ nonLus });
  } catch (err) {
    next(err);
  }
}

async function marquerLu(req, res, next) {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: req.params.id,
        etablissementId: req.user.etablissementId,
        OR: [{ destinataireId: req.user.id }, { destinataireRole: req.user.role }],
      },
    });
    if (!message) return res.status(404).json({ error: 'Message introuvable' });

    if (!message.luParUtilisateurIds.includes(req.user.id)) {
      await prisma.message.update({
        where: { id: message.id },
        data: { luParUtilisateurIds: { push: req.user.id } },
      });
    }

    res.json({ message: 'Marqué comme lu' });
  } catch (err) {
    next(err);
  }
}

async function envoyer(req, res, next) {
  try {
    const { contenu, destinataireId, destinataireRole } = req.body;

    if (!contenu || contenu.trim().length === 0) {
      return res.status(400).json({ error: 'Le contenu du message est requis' });
    }
    if (!destinataireId && !destinataireRole) {
      return res.status(400).json({ error: 'Choisissez un destinataire précis ou un poste à cibler' });
    }
    if (destinataireId && destinataireRole) {
      return res.status(400).json({ error: 'Choisissez soit une personne précise, soit un poste — pas les deux' });
    }

    if (destinataireId) {
      const destinataire = await prisma.utilisateur.findFirst({
        where: { id: destinataireId, etablissementId: req.user.etablissementId },
      });
      if (!destinataire) return res.status(404).json({ error: 'Destinataire introuvable' });
    }

    const message = await prisma.message.create({
      data: {
        etablissementId: req.user.etablissementId,
        expediteurId: req.user.id,
        destinataireId: destinataireId || null,
        destinataireRole: destinataireRole || null,
        contenu: contenu.trim(),
      },
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

async function listerEnvoyes(req, res, next) {
  try {
    const messages = await prisma.message.findMany({
      where: { etablissementId: req.user.etablissementId, expediteurId: req.user.id },
      include: { destinataire: true },
      orderBy: { dateEnvoi: 'desc' },
    });

    res.json(
      messages.map((m) => ({
        id: m.id,
        contenu: m.contenu,
        dateEnvoi: m.dateEnvoi,
        cible: m.destinataire ? `${m.destinataire.nom} ${m.destinataire.prenom}` : `Tous les ${m.destinataireRole}`,
        nombreLectures: m.luParUtilisateurIds.length,
      }))
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, compterNonLus, marquerLu, envoyer, listerEnvoyes };