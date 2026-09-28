const prisma = require('../config/prisma');
const { obtenirClasseIdsEnseignant } = require('../utils/enseignant.utils');
const { enregistrerAudit } = require('../services/audit.service');

async function lister(req, res, next) {
  try {
    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);
    const eleves = await prisma.eleve.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        ...(classeIdsEnseignant !== null
          ? {
              inscriptions: {
                some: { classeId: { in: classeIdsEnseignant }, statut: 'ACTIVE' },
              },
            }
          : {}),
      },
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

    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);
    if (classeIdsEnseignant !== null) {
      const autorise = eleve.inscriptions.some(
        (i) => i.statut === 'ACTIVE' && classeIdsEnseignant.includes(i.classeId)
      );
      if (!autorise) {
        return res.status(403).json({ error: "Cet élève n'est pas dans une de vos classes" });
      }
    }

    res.json(eleve);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const {
      matricule,
      nom,
      prenom,
      dateNaissance,
      sexe,
      adresse,
      contactUrgenceNom,
      contactUrgenceTel,
      pereNom,
      pereProfession,
      mereNom,
      mereProfession,
    } = req.body;

    if (!matricule || !nom || !prenom || !dateNaissance || !sexe) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants (matricule, nom, prenom, dateNaissance, sexe)',
      });
    }

    const photo = req.files?.photoIdentite?.[0];
    const extrait = req.files?.extraitNaissance?.[0];
    const bapteme = req.files?.carteBapteme?.[0];

    if (!photo) {
      return res.status(400).json({ error: "La photo d'identité est obligatoire" });
    }
    if (!extrait) {
      return res.status(400).json({ error: "La copie d'extrait de naissance est obligatoire" });
    }

    const eleve = await prisma.eleve.create({
      data: {
        etablissementId: req.user.etablissementId,
        matricule,
        nom,
        prenom,
        dateNaissance: new Date(dateNaissance),
        sexe,
        adresse: adresse || null,
        contactUrgenceNom: contactUrgenceNom || null,
        contactUrgenceTel: contactUrgenceTel || null,
        pereNom: pereNom || null,
        pereProfession: pereProfession || null,
        mereNom: mereNom || null,
        mereProfession: mereProfession || null,
        photoIdentiteUrl: `/uploads/eleves/${photo.filename}`,
        extraitNaissanceUrl: `/uploads/eleves/${extrait.filename}`,
        carteBaptemeUrl: bapteme ? `/uploads/eleves/${bapteme.filename}` : null,
      },
    });

    await enregistrerAudit({
      etablissementId: req.user.etablissementId,
      utilisateurId: req.user.id,
      action: 'CREATE_ELEVE',
      entite: 'Eleve',
      entiteId: eleve.id,
      details: { matricule: eleve.matricule, nom: eleve.nom, prenom: eleve.prenom },
      ip: req.ip,
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

    const {
      etablissementId,
      id,
      photoIdentite,
      extraitNaissance,
      carteBapteme,
      ...champs
    } = req.body;

    const data = { ...champs };
    if (data.dateNaissance) data.dateNaissance = new Date(data.dateNaissance);

    const photo = req.files?.photoIdentite?.[0];
    const extrait = req.files?.extraitNaissance?.[0];
    const bapteme = req.files?.carteBapteme?.[0];

    if (photo) data.photoIdentiteUrl = `/uploads/eleves/${photo.filename}`;
    if (extrait) data.extraitNaissanceUrl = `/uploads/eleves/${extrait.filename}`;
    if (bapteme) data.carteBaptemeUrl = `/uploads/eleves/${bapteme.filename}`;

    // Ne pas écraser avec des chaînes vides non voulues
    delete data.photoIdentiteUrl;
    delete data.extraitNaissanceUrl;
    delete data.carteBaptemeUrl;
    if (photo) data.photoIdentiteUrl = `/uploads/eleves/${photo.filename}`;
    if (extrait) data.extraitNaissanceUrl = `/uploads/eleves/${extrait.filename}`;
    if (bapteme) data.carteBaptemeUrl = `/uploads/eleves/${bapteme.filename}`;

    const eleve = await prisma.eleve.update({
      where: { id: req.params.id },
      data,
    });

    res.json(eleve);
  } catch (err) {
    next(err);
  }
}

async function supprimer(req, res, next) {
  try {
    const existant = await prisma.eleve.findFirst({
      where: { id: req.params.id, etablissementId: req.user.etablissementId },
    });
    if (!existant) return res.status(404).json({ error: 'Élève introuvable' });

    await prisma.eleve.delete({ where: { id: req.params.id } });
    res.json({ message: 'Élève supprimé' });
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, obtenirParId, creer, modifier, supprimer };