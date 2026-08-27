const prisma = require('../config/prisma');

const JOURS = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' };

async function listerParClasse(req, res, next) {
  try {
    const { classeId } = req.query;
    if (!classeId) return res.status(400).json({ error: 'classeId requis' });

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

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
    if (jour < 1 || jour > 6) {
      return res.status(400).json({ error: 'jour doit être entre 1 (lundi) et 6 (samedi)' });
    }

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    // Vérifie qu'il n'y a pas de chevauchement horaire pour cette classe ce jour-là
    const conflits = await prisma.emploiDuTemps.findMany({
      where: { classeId, jour },
    });
    const chevauchement = conflits.some(
      (c) => heureDebut < c.heureFin && heureFin > c.heureDebut
    );
    if (chevauchement) {
      return res.status(409).json({ error: 'Ce créneau chevauche une séance déjà existante pour cette classe' });
    }

    const seance = await prisma.emploiDuTemps.create({
      data: { classeId, matiereId, enseignantId, jour, heureDebut, heureFin },
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