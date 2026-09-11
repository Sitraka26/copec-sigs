const prisma = require('../config/prisma');
const { envoyerSms } = require('../services/sms.service');
const { obtenirClasseIdsEnseignant } = require('../utils/enseignant.utils');

async function listerPourSaisie(req, res, next) {
  try {
    const { classeId, date } = req.query;
    if (!classeId || !date) return res.status(400).json({ error: 'classeId et date sont requis' });

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);
    if (classeIdsEnseignant !== null && !classeIdsEnseignant.includes(classeId)) {
      return res.status(403).json({ error: "Vous n'enseignez pas dans cette classe" });
    }

    const dateJour = new Date(date);

    const inscriptions = await prisma.inscription.findMany({
      where: { classeId, statut: 'ACTIVE' },
      include: {
        eleve: {
          include: {
            presences: { where: { date: dateJour } },
          },
        },
      },
      orderBy: { eleve: { nom: 'asc' } },
    });

    const grille = inscriptions.map((insc) => ({
      eleveId: insc.eleve.id,
      matricule: insc.eleve.matricule,
      nom: insc.eleve.nom,
      prenom: insc.eleve.prenom,
      statut: insc.eleve.presences[0]?.statut ?? 'PRESENT',
      justifie: insc.eleve.presences[0]?.justifie ?? false,
    }));

    res.json({ date, eleves: grille });
  } catch (err) {
    next(err);
  }
}

async function enregistrerLot(req, res, next) {
  try {
    const { classeId, date, presences } = req.body;

    if (!classeId || !date || !Array.isArray(presences)) {
      return res.status(400).json({ error: 'classeId, date et presences[] sont requis' });
    }

    const statutsValides = ['PRESENT', 'ABSENT', 'RETARD'];
    for (const p of presences) {
      if (!statutsValides.includes(p.statut)) {
        return res.status(400).json({ error: `Statut invalide pour l'élève ${p.eleveId}` });
      }
    }

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);
    if (classeIdsEnseignant !== null && !classeIdsEnseignant.includes(classeId)) {
      return res.status(403).json({ error: "Vous n'enseignez pas dans cette classe" });
    }

    const eleveIds = presences.map((p) => p.eleveId);
    const inscriptionsValides = await prisma.inscription.findMany({
      where: { classeId, eleveId: { in: eleveIds }, statut: 'ACTIVE' },
      select: { eleveId: true },
    });
    const idsValides = new Set(inscriptionsValides.map((i) => i.eleveId));
    const idsInvalides = eleveIds.filter((id) => !idsValides.has(id));
    if (idsInvalides.length > 0) {
      return res.status(400).json({ error: `Élève(s) non inscrit(s) dans cette classe : ${idsInvalides.join(', ')}` });
    }

    const dateJour = new Date(date);

    const presencesExistantes = await prisma.presence.findMany({
      where: { eleveId: { in: eleveIds }, date: dateJour },
    });
    const statutAvant = {};
    presencesExistantes.forEach((p) => (statutAvant[p.eleveId] = p.statut));

    const resultats = [];

    for (const p of presences) {
      const presence = await prisma.presence.upsert({
        where: { eleveId_date: { eleveId: p.eleveId, date: dateJour } },
        update: { statut: p.statut, justifie: p.justifie ?? false },
        create: { eleveId: p.eleveId, date: dateJour, statut: p.statut, justifie: p.justifie ?? false },
      });

      let notification = null;
      const etaitDejaAbsent = statutAvant[p.eleveId] === 'ABSENT';
      if (p.statut === 'ABSENT' && !etaitDejaAbsent) {
        const eleve = await prisma.eleve.findUnique({ where: { id: p.eleveId } });
        const message = `Bonjour, votre enfant ${eleve.prenom} ${eleve.nom} est marqué(e) absent(e) aujourd'hui ${new Date(date).toLocaleDateString('fr-FR')} à ${classe.nom}. Merci de nous contacter si besoin.`;
        notification = await envoyerSms(eleve.contactUrgenceTel, message);
      }

      resultats.push({ eleveId: p.eleveId, presence, notification });
    }

    res.json({ enregistrees: resultats.length, resultats });
  } catch (err) {
    next(err);
  }
}

async function lister(req, res, next) {
  try {
    const { classeId, date } = req.query;

    const presences = await prisma.presence.findMany({
      where: {
        eleve: { etablissementId: req.user.etablissementId },
        ...(date ? { date: new Date(date) } : {}),
        ...(classeId
          ? { eleve: { inscriptions: { some: { classeId, statut: 'ACTIVE' } } } }
          : {}),
      },
      include: { eleve: true },
      orderBy: { date: 'desc' },
    });

    res.json(presences);
  } catch (err) {
    next(err);
  }
}

module.exports = { listerPourSaisie, enregistrerLot, lister };