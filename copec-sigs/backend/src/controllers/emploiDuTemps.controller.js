const prisma = require('../config/prisma');
const { obtenirClasseIdsEnseignant } = require('../utils/enseignant.utils');

const JOURS = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' };
const CYCLES_PRIMAIRE = new Set(['PRESCOLAIRE', 'PRIMAIRE']);
const CYCLES_SECONDAIRE = new Set(['COLLEGE', 'LYCEE']);

async function listerParClasse(req, res, next) {
  try {
    const { classeId } = req.query;
    if (!classeId) return res.status(400).json({ error: 'classeId requis' });

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
      include: { niveau: true },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);
    if (classeIdsEnseignant !== null && !classeIdsEnseignant.includes(classeId)) {
      return res.status(403).json({ error: "Vous n'enseignez pas dans cette classe" });
    }

    const seances = await prisma.emploiDuTemps.findMany({
      where: { classeId },
      include: { matiere: true, enseignant: { include: { utilisateur: true } } },
      orderBy: [{ jour: 'asc' }, { heureDebut: 'asc' }],
    });

    res.json(seances.map((s) => ({ ...s, jourLibelle: JOURS[s.jour] })));
  } catch (err) {
    next(err);
  }
}

async function creer(req, res, next) {
  try {
    const { classeId, matiereId, enseignantId, jour, heureDebut, heureFin } = req.body;

    if (!classeId || !matiereId || !enseignantId || !jour || !heureDebut || !heureFin) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    if (!Number.isInteger(Number(jour)) || Number(jour) < 1 || Number(jour) > 6) {
      return res.status(400).json({ error: 'jour doit être entre 1 (lundi) et 6 (samedi)' });
    }
    if (!/^\d{2}:\d{2}$/.test(heureDebut) || !/^\d{2}:\d{2}$/.test(heureFin) || heureDebut >= heureFin) {
      return res.status(400).json({ error: "L'heure de fin doit être après l'heure de début" });
    }

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
      include: { niveau: true },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const [matiere, enseignant] = await Promise.all([
      prisma.matiere.findFirst({ where: { id: matiereId, etablissementId: req.user.etablissementId } }),
      prisma.enseignant.findFirst({
        where: { id: enseignantId, utilisateur: { etablissementId: req.user.etablissementId } },
        include: { matieres: { include: { matiere: true } } },
      }),
    ]);
    if (!matiere) return res.status(404).json({ error: 'Matière introuvable' });
    if (!enseignant) return res.status(404).json({ error: 'Enseignant introuvable' });

    const estPrimaire = CYCLES_PRIMAIRE.has(classe.niveau.cycle);
    const estSecondaire = CYCLES_SECONDAIRE.has(classe.niveau.cycle);
    if (!estPrimaire && !estSecondaire) {
      return res.status(400).json({ error: 'Le cycle de cette classe n’est pas configuré pour l’emploi du temps' });
    }
    const matinFin = estSecondaire ? '12:00' : '11:30';
    const apresMidiDebut = '13:00';
    const apresMidiFin = estSecondaire ? '18:00' : '16:30';
    const estMatin = heureDebut < matinFin;
    const horaireValide = estMatin
      ? heureFin <= matinFin
      : heureDebut >= apresMidiDebut && heureFin <= apresMidiFin;
    if (!horaireValide) {
      return res.status(400).json({
        error: `Horaire invalide : matin jusqu'à ${matinFin}, après-midi de ${apresMidiDebut} à ${apresMidiFin}.`,
      });
    }

    const seancesEnseignant = await prisma.emploiDuTemps.findMany({
      where: { enseignantId, classe: { etablissementId: req.user.etablissementId } },
      include: { classe: { include: { niveau: true } } },
    });
    if (estPrimaire && seancesEnseignant.some((s) => CYCLES_SECONDAIRE.has(s.classe.niveau.cycle))) {
      return res.status(409).json({ error: 'Cet enseignant intervient déjà au secondaire et ne peut pas être affecté au préscolaire ou au primaire.' });
    }
    if (estSecondaire && seancesEnseignant.some((s) => CYCLES_PRIMAIRE.has(s.classe.niveau.cycle))) {
      return res.status(409).json({ error: 'Cet enseignant intervient déjà au préscolaire ou au primaire et ne peut pas être affecté au secondaire.' });
    }

    const seancesClasse = await prisma.emploiDuTemps.findMany({ where: { classeId } });
    if (estPrimaire && seancesClasse.some((s) => s.enseignantId !== enseignantId)) {
      return res.status(409).json({ error: 'Au préscolaire et au primaire, une classe garde le même enseignant pour toutes les matières.' });
    }
    if (estSecondaire && (enseignant.matieres.length < 1 || enseignant.matieres.length > 2)) {
      return res.status(400).json({ error: 'Au secondaire, un enseignant peut être habilité pour une ou deux matières maximum.' });
    }
    if (estSecondaire && !enseignant.matieres.some((item) => item.matiereId === matiereId)) {
      return res.status(400).json({
        error: `Cet enseignant est habilité pour "${enseignant.matieres[0]?.matiere?.nom || 'une autre matière'}" et ne peut pas enseigner "${matiere.nom}".`,
      });
    }
    const conflitsClasse = seancesClasse.filter((s) => Number(s.jour) === Number(jour));
    const chevauchementClasse = conflitsClasse.some((c) => heureDebut < c.heureFin && heureFin > c.heureDebut);
    if (chevauchementClasse) {
      return res.status(409).json({ error: 'Ce créneau chevauche une séance déjà existante pour cette classe' });
    }

    const conflitsEnseignant = seancesEnseignant.filter((s) => Number(s.jour) === Number(jour));
    const conflitEnseignant = conflitsEnseignant.find((c) => heureDebut < c.heureFin && heureFin > c.heureDebut);
    if (conflitEnseignant) {
      return res.status(409).json({
        error: `Cet enseignant a déjà une séance sur ce créneau, dans la classe "${conflitEnseignant.classe.nom}"`,
      });
    }

    const seance = await prisma.emploiDuTemps.create({
      data: { classeId, matiereId, enseignantId, jour: Number(jour), heureDebut, heureFin },
      include: { matiere: true, enseignant: { include: { utilisateur: true } } },
    });

    res.status(201).json(seance);
  } catch (err) {
    next(err);
  }
}

async function supprimer(req, res, next) {
  try {
    const seance = await prisma.emploiDuTemps.findFirst({
      where: { id: req.params.id },
      include: { classe: true },
    });
    if (!seance || seance.classe.etablissementId !== req.user.etablissementId) {
      return res.status(404).json({ error: 'Séance introuvable' });
    }
    await prisma.emploiDuTemps.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listerParClasse, creer, supprimer };