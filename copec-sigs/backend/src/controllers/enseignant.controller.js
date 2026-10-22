const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOM_PRENOM_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
const TEL_MG_REGEX = /^0(32|33|34|37|38)\d{7}$/;
const CYCLES_AUTORISES = ['PRESCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'];
const JOURS_LIB = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' };

function validerHeure(h) {
  if (!/^\d{2}:\d{2}$/.test(h)) return false;
  const [hh, mm] = h.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function validerDonneesEnseignant(
  { nom, prenom, email, telephone, cyclePrincipal },
  isUpdate = false
) {
  const erreurs = [];

  if (!isUpdate || nom !== undefined) {
    if (!nom || !nom.trim()) erreurs.push('Le nom est requis');
    else if (!NOM_PRENOM_REGEX.test(nom.trim())) erreurs.push('Le nom contient des caractères invalides');
  }
  if (!isUpdate || prenom !== undefined) {
    if (!prenom || !prenom.trim()) erreurs.push('Le prénom est requis');
    else if (!NOM_PRENOM_REGEX.test(prenom.trim())) erreurs.push('Le prénom contient des caractères invalides');
  }
  if (!isUpdate || email !== undefined) {
    if (!email || !email.trim()) erreurs.push("L'adresse email est requise");
    else if (!EMAIL_REGEX.test(email.trim())) erreurs.push("Le format de l'adresse email est invalide");
  }
  if (telephone && telephone.trim() !== '') {
    const cleanTel = telephone.trim().replace(/\s+/g, '');
    if (!TEL_MG_REGEX.test(cleanTel)) {
      erreurs.push('Le numéro de téléphone est invalide (ex: 0341234567)');
    }
  }
  if (!isUpdate || cyclePrincipal !== undefined) {
    if (!cyclePrincipal || !CYCLES_AUTORISES.includes(cyclePrincipal)) {
      erreurs.push(`Cycle invalide. Valeurs acceptées: ${CYCLES_AUTORISES.join(', ')}`);
    }
  }
  return erreurs;
}

async function trouverEnseignant(id, etablissementId) {
  return prisma.enseignant.findFirst({
    where: { id, utilisateur: { etablissementId } },
  });
}

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

async function creer(req, res, next) {
  try {
    const { nom, prenom, email, telephone, matiereIds, cyclePrincipal } = req.body;

    const erreurs = validerDonneesEnseignant(
      { nom, prenom, email, telephone, cyclePrincipal },
      false
    );
    if (erreurs.length > 0) {
      return res.status(400).json({ error: erreurs.join(', ') });
    }

    const cleanNom = nom.trim().toUpperCase();
    const cleanPrenom = prenom.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanTel = telephone ? telephone.trim().replace(/\s+/g, '') : null;

    const estSecondaire = cyclePrincipal === 'COLLEGE' || cyclePrincipal === 'LYCEE';
    let idsMatieres = Array.isArray(matiereIds) ? matiereIds : [];

    if (estSecondaire) {
      if (idsMatieres.length === 0) {
        return res.status(400).json({
          error: 'Au collège / lycée, choisissez au moins 1 matière (max 2)',
        });
      }
      if (idsMatieres.length > 2) {
        return res.status(400).json({
          error: 'Un enseignant du secondaire ne peut avoir que 2 matières maximum',
        });
      }
    } else {
      idsMatieres = [];
    }

    if (idsMatieres.length > 0) {
      const matieresExiste = await prisma.matiere.count({
        where: {
          id: { in: idsMatieres },
          etablissementId: req.user.etablissementId,
        },
      });
      if (matieresExiste !== idsMatieres.length) {
        return res.status(400).json({
          error: "Une ou plusieurs matières sélectionnées n'existent pas",
        });
      }
    }

    const motDePasseTemporaire = crypto.randomBytes(6).toString('base64url');
    const motDePasseHash = await bcrypt.hash(motDePasseTemporaire, 10);

    const utilisateur = await prisma.utilisateur.create({
      data: {
        etablissementId: req.user.etablissementId,
        nom: cleanNom,
        prenom: cleanPrenom,
        email: cleanEmail,
        motDePasse: motDePasseHash,
        role: 'ENSEIGNANT',
      },
    });

    const enseignant = await prisma.enseignant.create({
      data: {
        utilisateurId: utilisateur.id,
        telephone: cleanTel,
        cyclePrincipal,
      },
    });

    if (idsMatieres.length > 0) {
      await prisma.enseignantMatiere.createMany({
        data: idsMatieres.map((matiereId) => ({
          enseignantId: enseignant.id,
          matiereId,
        })),
      });
    }

    res.status(201).json({
      enseignant,
      utilisateur: {
        id: utilisateur.id,
        nom: cleanNom,
        prenom: cleanPrenom,
        email: cleanEmail,
      },
      motDePasseTemporaire,
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }
    next(err);
  }
}

async function assignerMatieres(req, res, next) {
  try {
    const { matiereIds } = req.body;
    if (!Array.isArray(matiereIds)) {
      return res.status(400).json({ error: 'matiereIds doit être un tableau' });
    }

    const enseignant = await trouverEnseignant(req.params.id, req.user.etablissementId);
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    if (
      enseignant.cyclePrincipal === 'PRESCOLAIRE' ||
      enseignant.cyclePrincipal === 'PRIMAIRE'
    ) {
      return res.status(400).json({
        error: 'Préscolaire / primaire : pas d’affectation de matières (polyvalent)',
      });
    }

    if (matiereIds.length > 2) {
      return res.status(400).json({
        error: 'Maximum 2 matières pour un enseignant du secondaire',
      });
    }

    if (matiereIds.length > 0) {
      const matieresExiste = await prisma.matiere.count({
        where: {
          id: { in: matiereIds },
          etablissementId: req.user.etablissementId,
        },
      });
      if (matieresExiste !== matiereIds.length) {
        return res.status(400).json({ error: 'Une ou plusieurs matières sont invalides' });
      }
    }

    await prisma.$transaction([
      prisma.enseignantMatiere.deleteMany({ where: { enseignantId: enseignant.id } }),
      prisma.enseignantMatiere.createMany({
        data: matiereIds.map((matiereId) => ({
          enseignantId: enseignant.id,
          matiereId,
        })),
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
    const { nom, prenom, email, telephone, cyclePrincipal } = req.body;

    const enseignant = await prisma.enseignant.findFirst({
      where: {
        id: req.params.id,
        utilisateur: { etablissementId: req.user.etablissementId },
      },
      include: { utilisateur: true },
    });
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    const erreurs = validerDonneesEnseignant(
      { nom, prenom, email, telephone, cyclePrincipal },
      true
    );
    if (erreurs.length > 0) {
      return res.status(400).json({ error: erreurs.join(', ') });
    }

    if (nom || prenom || email) {
      const dataUser = {};
      if (nom) dataUser.nom = nom.trim().toUpperCase();
      if (prenom) dataUser.prenom = prenom.trim();
      if (email) dataUser.email = email.trim().toLowerCase();
      try {
        await prisma.utilisateur.update({
          where: { id: enseignant.utilisateurId },
          data: dataUser,
        });
      } catch (err) {
        if (err.code === 'P2002') {
          return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
        }
        throw err;
      }
    }

    const dataEns = {};
    if (telephone !== undefined) {
      dataEns.telephone = telephone ? telephone.trim().replace(/\s+/g, '') : null;
    }
    if (cyclePrincipal) dataEns.cyclePrincipal = cyclePrincipal;

    if (cyclePrincipal === 'PRESCOLAIRE' || cyclePrincipal === 'PRIMAIRE') {
      await prisma.enseignantMatiere.deleteMany({
        where: { enseignantId: enseignant.id },
      });
    }

    const enseignantMisAJour = await prisma.enseignant.update({
      where: { id: enseignant.id },
      data: dataEns,
      include: { utilisateur: true, matieres: { include: { matiere: true } } },
    });

    res.json(enseignantMisAJour);
  } catch (err) {
    next(err);
  }
}

async function supprimer(req, res, next) {
  try {
    const enseignant = await trouverEnseignant(req.params.id, req.user.etablissementId);
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    const seances = await prisma.emploiDuTemps.count({
      where: { enseignantId: enseignant.id },
    });
    if (seances > 0) {
      return res.status(400).json({
        error: "Impossible de supprimer: l'enseignant a des créneaux d'emploi du temps",
      });
    }

    await prisma.$transaction([
      prisma.indisponibiliteEnseignant.deleteMany({
        where: { enseignantId: enseignant.id },
      }),
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
    const enseignant = await trouverEnseignant(req.params.id, req.user.etablissementId);
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    const motDePasseTemporaire = crypto.randomBytes(6).toString('base64url');
    const motDePasseHash = await bcrypt.hash(motDePasseTemporaire, 10);

    await prisma.utilisateur.update({
      where: { id: enseignant.utilisateurId },
      data: { motDePasse: motDePasseHash },
    });

    res.json({ motDePasseTemporaire });
  } catch (err) {
    next(err);
  }
}

/** GET /api/enseignants/:id/indisponibilites */
async function listerIndisponibilites(req, res, next) {
  try {
    const enseignant = await trouverEnseignant(req.params.id, req.user.etablissementId);
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    const liste = await prisma.indisponibiliteEnseignant.findMany({
      where: {
        enseignantId: enseignant.id,
        etablissementId: req.user.etablissementId,
      },
      orderBy: [{ jour: 'asc' }, { heureDebut: 'asc' }],
    });

    res.json(
      liste.map((i) => ({
        ...i,
        jourLibelle: JOURS_LIB[i.jour] || String(i.jour),
      }))
    );
  } catch (err) {
    next(err);
  }
}

/** POST /api/enseignants/:id/indisponibilites */
async function creerIndisponibilite(req, res, next) {
  try {
    const { jour, heureDebut, heureFin, motif } = req.body;
    const enseignant = await trouverEnseignant(req.params.id, req.user.etablissementId);
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    if (!Number.isInteger(Number(jour)) || Number(jour) < 1 || Number(jour) > 6) {
      return res.status(400).json({ error: 'jour doit être entre 1 et 6' });
    }
    if (!validerHeure(heureDebut) || !validerHeure(heureFin) || heureDebut >= heureFin) {
      return res.status(400).json({
        error: 'Heures invalides (format HH:MM, fin après début)',
      });
    }

    // Chevauchement avec une autre indispo
    const existantes = await prisma.indisponibiliteEnseignant.findMany({
      where: {
        enseignantId: enseignant.id,
        jour: Number(jour),
      },
    });
    const conflit = existantes.find(
      (i) => heureDebut < i.heureFin && heureFin > i.heureDebut
    );
    if (conflit) {
      return res.status(409).json({
        error: `Chevauche déjà une indisponibilité ${conflit.heureDebut}–${conflit.heureFin}`,
      });
    }

    const record = await prisma.indisponibiliteEnseignant.create({
      data: {
        etablissementId: req.user.etablissementId,
        enseignantId: enseignant.id,
        jour: Number(jour),
        heureDebut,
        heureFin,
        motif: motif?.trim() || 'Autre école',
      },
    });

    res.status(201).json({
      ...record,
      jourLibelle: JOURS_LIB[record.jour],
    });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/enseignants/:id/indisponibilites/:indispoId */
async function supprimerIndisponibilite(req, res, next) {
  try {
    const enseignant = await trouverEnseignant(req.params.id, req.user.etablissementId);
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    const indispo = await prisma.indisponibiliteEnseignant.findFirst({
      where: {
        id: req.params.indispoId,
        enseignantId: enseignant.id,
        etablissementId: req.user.etablissementId,
      },
    });
    if (!indispo) return res.status(404).json({ error: 'Indisponibilité introuvable' });

    await prisma.indisponibiliteEnseignant.delete({ where: { id: indispo.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  lister,
  creer,
  assignerMatieres,
  mettreAJour,
  supprimer,
  reinitialiserMotDePasse,
  listerIndisponibilites,
  creerIndisponibilite,
  supprimerIndisponibilite,
};