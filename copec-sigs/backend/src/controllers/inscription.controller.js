const prisma = require('../config/prisma');

// Bornes d'âge par cycle (larges pour redoublements / retards)
const AGES_PAR_CYCLE = {
  PRESCOLAIRE: { min: 2, max: 6 },
  PRIMAIRE: { min: 5, max: 13 },
  COLLEGE: { min: 10, max: 17 },
  LYCEE: { min: 14, max: 22 },
};

/** Âge au 31 décembre de l'année civile en cours */
function ageAu31Decembre(dateNaissance) {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (Number.isNaN(d.getTime())) return null;
  const anneeRef = new Date().getFullYear();
  let age = anneeRef - d.getFullYear();
  const m = 11; // décembre
  const jour = 31;
  if (d.getMonth() > m || (d.getMonth() === m && d.getDate() > jour)) {
    age -= 1;
  }
  // Plus simple et stable : âge calendaire au 31/12
  age = anneeRef - d.getFullYear();
  if (d.getMonth() > 11 || (d.getMonth() === 11 && d.getDate() > 31)) age -= 1;
  // Calcul standard :
  const ref = new Date(anneeRef, 11, 31);
  age = ref.getFullYear() - d.getFullYear();
  const mDiff = ref.getMonth() - d.getMonth();
  if (mDiff < 0 || (mDiff === 0 && ref.getDate() < d.getDate())) age -= 1;
  return age;
}

function verifierAgePourCycle(dateNaissance, cycle) {
  const bornes = AGES_PAR_CYCLE[cycle];
  if (!bornes) return { ok: true };
  const age = ageAu31Decembre(dateNaissance);
  if (age === null) {
    return { ok: false, error: "Date de naissance de l'élève manquante ou invalide" };
  }
  if (age < bornes.min || age > bornes.max) {
    return {
      ok: false,
      error: `Âge non adapté au cycle ${cycle} (âge calculé : ${age} ans, attendu ${bornes.min}–${bornes.max} ans)`,
      age,
    };
  }
  return { ok: true, age };
}

async function lister(req, res, next) {
  try {
    const { classeId, anneeScolaireId, statut } = req.query;

    const inscriptions = await prisma.inscription.findMany({
      where: {
        classe: { etablissementId: req.user.etablissementId },
        ...(classeId ? { classeId } : {}),
        ...(anneeScolaireId ? { anneeScolaireId } : {}),
        ...(statut ? { statut } : {}),
      },
      include: {
        eleve: true,
        classe: { include: { niveau: true } },
        anneeScolaire: true,
      },
      orderBy: { eleve: { nom: 'asc' } },
    });

    res.json(inscriptions);
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { eleveId, classeId, anneeScolaireId } = req.body;

    if (!eleveId || !classeId || !anneeScolaireId) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants (eleveId, classeId, anneeScolaireId)',
      });
    }

    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
    });
    if (!eleve) {
      return res.status(404).json({ error: 'Élève introuvable dans cet établissement' });
    }

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
      include: { niveau: true },
    });
    if (!classe) {
      return res.status(404).json({ error: 'Classe introuvable dans cet établissement' });
    }

    const cycle = classe.niveau?.cycle;
    if (cycle) {
      const check = verifierAgePourCycle(eleve.dateNaissance, cycle);
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }
    }

    const inscription = await prisma.inscription.create({
      data: { eleveId, classeId, anneeScolaireId },
      include: { eleve: true, classe: { include: { niveau: true } } },
    });

    res.status(201).json(inscription);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Cet élève est déjà inscrit pour cette année scolaire',
      });
    }
    next(err);
  }
}

async function modifierStatut(req, res, next) {
  try {
    const { statut } = req.body;
    const statutsValides = ['ACTIVE', 'TRANSFEREE', 'ABANDONNEE', 'DIPLOMEE'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        error: `Statut invalide. Valeurs possibles : ${statutsValides.join(', ')}`,
      });
    }

    const existante = await prisma.inscription.findFirst({
      where: {
        id: req.params.id,
        classe: { etablissementId: req.user.etablissementId },
      },
    });
    if (!existante) return res.status(404).json({ error: 'Inscription introuvable' });

    const inscription = await prisma.inscription.update({
      where: { id: req.params.id },
      data: { statut },
      include: { eleve: true, classe: true },
    });

    res.json(inscription);
  } catch (err) {
    next(err);
  }
}

async function changerClasse(req, res, next) {
  try {
    const { classeId } = req.body;
    if (!classeId) return res.status(400).json({ error: 'classeId requis' });

    const existante = await prisma.inscription.findFirst({
      where: {
        id: req.params.id,
        classe: { etablissementId: req.user.etablissementId },
      },
      include: { eleve: true },
    });
    if (!existante) return res.status(404).json({ error: 'Inscription introuvable' });

    const nouvelleClasse = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
      include: { niveau: true },
    });
    if (!nouvelleClasse) {
      return res.status(404).json({
        error: 'Classe cible introuvable dans cet établissement',
      });
    }

    const cycle = nouvelleClasse.niveau?.cycle;
    if (cycle) {
      const check = verifierAgePourCycle(existante.eleve.dateNaissance, cycle);
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }
    }

    const inscription = await prisma.inscription.update({
      where: { id: req.params.id },
      data: { classeId },
      include: { eleve: true, classe: { include: { niveau: true } } },
    });

    res.json(inscription);
  } catch (err) {
    next(err);
  }
}

module.exports = { lister, creer, modifierStatut, changerClasse };