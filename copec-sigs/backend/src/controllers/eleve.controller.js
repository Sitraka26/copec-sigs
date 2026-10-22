const prisma = require('../config/prisma');
const { obtenirClasseIdsEnseignant } = require('../utils/enseignant.utils');
const { enregistrerAudit } = require('../services/audit.service');

// --- RÈGLES DE VALIDATION ---
const NOM_PRENOM_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
const MATRICULE_REGEX = /^[A-Za-z0-9_-]+$/;
const TEL_MG_REGEX = /^0(32|33|34|37|38)\d{7}$/;
const CYCLES_AUTORISES = ['PRESCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'];

// Limites d'âge par cycle (Min, Max)
const BORNES_AGE_CYCLES = {
  PRESCOLAIRE: { min: 2, max: 6 },
  PRIMAIRE: { min: 5, max: 13 },
  COLLEGE: { min: 10, max: 18 },
  LYCEE: { min: 13, max: 22 },
};

/**
 * Calcule l'âge exact d'une personne en années
 */
function calculerAge(dateNaissance) {
  const aujourdhui = new Date();
  const naissance = new Date(dateNaissance);
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const moisDiff = aujourdhui.getMonth() - naissance.getMonth();

  if (moisDiff < 0 || (moisDiff === 0 && aujourdhui.getDate() < naissance.getDate())) {
    age--;
  }
  return age;
}

/**
 * Normalise le champ sexe vers l'Enum Prisma (M/F -> MASCULIN/FEMININ)
 */
function normaliserSexe(sexe) {
  if (!sexe) return null;
  const s = String(sexe).trim().toUpperCase();
  if (s === 'M' || s === 'MASCULIN') return 'MASCULIN';
  if (s === 'F' || s === 'FEMININ') return 'FEMININ';
  return null;
}

/**
 * Contrôleur de validation des champs pour un Élève
 */
function validerDonneesEleve(payload, isUpdate = false) {
  const {
    matricule,
    nom,
    prenom,
    dateNaissance,
    sexe,
    contactUrgenceTel,
    cycleVise,
  } = payload;

  const erreurs = [];

  // Matricule
  if (!isUpdate || matricule !== undefined) {
    if (!matricule || !String(matricule).trim()) {
      erreurs.push('Le matricule est obligatoire');
    } else if (!MATRICULE_REGEX.test(String(matricule).trim())) {
      erreurs.push('Le matricule ne doit contenir que des lettres, chiffres, tirets ou underscores');
    }
  }

  // Nom
  if (!isUpdate || nom !== undefined) {
    if (!nom || !String(nom).trim()) {
      erreurs.push('Le nom est obligatoire');
    } else if (!NOM_PRENOM_REGEX.test(String(nom).trim())) {
      erreurs.push('Le nom contient des caractères invalides');
    }
  }

  // Prénom
  if (!isUpdate || prenom !== undefined) {
    if (!prenom || !String(prenom).trim()) {
      erreurs.push('Le prénom est obligatoire');
    } else if (!NOM_PRENOM_REGEX.test(String(prenom).trim())) {
      erreurs.push('Le prénom contient des caractères invalides');
    }
  }

  // Date de Naissance
  let dateParsed = null;
  if (!isUpdate || dateNaissance !== undefined) {
    if (!dateNaissance) {
      erreurs.push('La date de naissance est obligatoire');
    } else {
      dateParsed = new Date(dateNaissance);
      if (isNaN(dateParsed.getTime())) {
        erreurs.push('La date de naissance est invalide');
      } else {
        const aujourdhui = new Date();
        if (dateParsed >= aujourdhui) {
          erreurs.push('La date de naissance doit être dans le passé');
        }
      }
    }
  }

  // Sexe (Enum MASCULIN / FEMININ)
  if (!isUpdate || sexe !== undefined) {
    const sexeEnum = normaliserSexe(sexe);
    if (!sexeEnum) {
      erreurs.push('Le sexe est obligatoire et doit être F, M, MASCULIN ou FEMININ');
    }
  }

  // Téléphone de contact d'urgence (optionnel)
  if (contactUrgenceTel && String(contactUrgenceTel).trim() !== '') {
    const cleanTel = String(contactUrgenceTel).trim().replace(/\s+/g, '');
    if (!TEL_MG_REGEX.test(cleanTel)) {
      erreurs.push('Le téléphone d\'urgence doit comporter 10 chiffres (ex: 0341234567)');
    }
  }

  // Cycle Visé et Validation par Âge
  if (cycleVise) {
    if (!CYCLES_AUTORISES.includes(cycleVise)) {
      erreurs.push(`Cycle visé invalide (${CYCLES_AUTORISES.join(', ')})`);
    } else if (dateParsed && !isNaN(dateParsed.getTime())) {
      const age = calculerAge(dateParsed);
      const limites = BORNES_AGE_CYCLES[cycleVise];

      if (limites) {
        if (age < limites.min) {
          erreurs.push(
            `L'élève est trop jeune pour le cycle ${cycleVise} (${age} ans). Âge minimum : ${limites.min} ans.`
          );
        } else if (age > limites.max) {
          erreurs.push(
            `L'élève a ${age} ans et ne peut pas être inscrit en ${cycleVise}. Âge maximum : ${limites.max} ans.`
          );
        }
      }
    }
  }

  return erreurs;
}

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
      cycleVise,
      vientAutreEcole,
    } = req.body;

    // --- CONTRÔLE DES CHAMPS (INCLUANT L'ÂGE ET LE CYCLE) ---
    const erreurs = validerDonneesEleve(req.body, false);
    if (erreurs.length > 0) {
      return res.status(400).json({ error: erreurs.join(' | ') });
    }

    const sexeEnum = normaliserSexe(sexe);
    const cleanMatricule = matricule.trim();
    const cleanNom = nom.trim().toUpperCase();
    const cleanPrenom = prenom.trim();
    const dateNaissParsed = new Date(dateNaissance);

    // --- Doublon : même nom + prénom + date de naissance ---
    const doublon = await prisma.eleve.findFirst({
      where: {
        etablissementId: req.user.etablissementId,
        nom: { equals: cleanNom, mode: 'insensitive' },
        prenom: { equals: cleanPrenom, mode: 'insensitive' },
        dateNaissance: dateNaissParsed,
      },
    });
    if (doublon) {
      return res.status(409).json({
        error: `Élève déjà enregistré : ${doublon.matricule} — ${doublon.nom} ${doublon.prenom}`,
      });
    }

    const photo = req.files?.photoIdentite?.[0];
    const extrait = req.files?.extraitNaissance?.[0];
    const bapteme = req.files?.carteBapteme?.[0];
    const bulletinOrigine = req.files?.bulletinOrigine?.[0];

    if (!photo) {
      return res.status(400).json({ error: "La photo d'identité est obligatoire" });
    }

    // Extrait obligatoire UNIQUEMENT pour le préscolaire
    if (cycleVise === 'PRESCOLAIRE' && !extrait) {
      return res.status(400).json({
        error: "La copie d'extrait de naissance est obligatoire pour le préscolaire",
      });
    }

    // Transfert : bulletin d'origine obligatoire
    const transfert = vientAutreEcole === 'true' || vientAutreEcole === true;
    if (transfert && !bulletinOrigine) {
      return res.status(400).json({
        error: "Le bulletin de l'école d'origine est obligatoire pour un élève en transfert",
      });
    }

    const eleve = await prisma.eleve.create({
      data: {
        etablissementId: req.user.etablissementId,
        matricule: cleanMatricule,
        nom: cleanNom,
        prenom: cleanPrenom,
        dateNaissance: dateNaissParsed,
        sexe: sexeEnum,
        adresse: adresse ? adresse.trim() : null,
        contactUrgenceNom: contactUrgenceNom ? contactUrgenceNom.trim() : null,
        contactUrgenceTel: contactUrgenceTel ? contactUrgenceTel.trim().replace(/\s+/g, '') : null,
        pereNom: pereNom ? pereNom.trim() : null,
        pereProfession: pereProfession ? pereProfession.trim() : null,
        mereNom: mereNom ? mereNom.trim() : null,
        mereProfession: mereProfession ? mereProfession.trim() : null,
        cycleVise: cycleVise || null,
        vientAutreEcole: transfert,
        photoIdentiteUrl: `/uploads/eleves/${photo.filename}`,
        extraitNaissanceUrl: extrait ? `/uploads/eleves/${extrait.filename}` : null,
        carteBaptemeUrl: bapteme ? `/uploads/eleves/${bapteme.filename}` : null,
        bulletinOrigineUrl: bulletinOrigine
          ? `/uploads/eleves/${bulletinOrigine.filename}`
          : null,
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

    // Fusionner la date de naissance et le cycle existants si non envoyés lors d'une modification partielle
    const payloadControle = {
      ...req.body,
      dateNaissance: req.body.dateNaissance || existant.dateNaissance,
      cycleVise: req.body.cycleVise || existant.cycleVise,
    };

    // --- CONTRÔLE DES CHAMPS ---
    const erreurs = validerDonneesEleve(payloadControle, true);
    if (erreurs.length > 0) {
      return res.status(400).json({ error: erreurs.join(' | ') });
    }

    const {
      etablissementId,
      id,
      photoIdentite,
      extraitNaissance,
      carteBapteme,
      bulletinOrigine,
      vientAutreEcole,
      sexe,
      nom,
      prenom,
      matricule,
      contactUrgenceTel,
      ...champs
    } = req.body;

    const data = { ...champs };

    if (nom) data.nom = nom.trim().toUpperCase();
    if (prenom) data.prenom = prenom.trim();
    if (matricule) data.matricule = matricule.trim();
    if (sexe) data.sexe = normaliserSexe(sexe);
    if (contactUrgenceTel) data.contactUrgenceTel = contactUrgenceTel.trim().replace(/\s+/g, '');
    if (data.dateNaissance) data.dateNaissance = new Date(data.dateNaissance);

    if (vientAutreEcole !== undefined) {
      data.vientAutreEcole = vientAutreEcole === 'true' || vientAutreEcole === true;
    }

    // Doublon sur modification (exclure soi-même)
    if (data.nom && data.prenom && data.dateNaissance) {
      const doublon = await prisma.eleve.findFirst({
        where: {
          etablissementId: req.user.etablissementId,
          id: { not: req.params.id },
          nom: { equals: String(data.nom).trim(), mode: 'insensitive' },
          prenom: { equals: String(data.prenom).trim(), mode: 'insensitive' },
          dateNaissance: data.dateNaissance,
        },
      });
      if (doublon) {
        return res.status(409).json({
          error: `Doublon avec l'élève ${doublon.matricule}`,
        });
      }
    }

    const photo = req.files?.photoIdentite?.[0];
    const extrait = req.files?.extraitNaissance?.[0];
    const bapteme = req.files?.carteBapteme?.[0];
    const bulletin = req.files?.bulletinOrigine?.[0];

    if (photo) data.photoIdentiteUrl = `/uploads/eleves/${photo.filename}`;
    if (extrait) data.extraitNaissanceUrl = `/uploads/eleves/${extrait.filename}`;
    if (bapteme) data.carteBaptemeUrl = `/uploads/eleves/${bapteme.filename}`;
    if (bulletin) data.bulletinOrigineUrl = `/uploads/eleves/${bulletin.filename}`;

    const eleve = await prisma.eleve.update({
      where: { id: req.params.id },
      data,
    });

    res.json(eleve);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ce matricule existe déjà' });
    }
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