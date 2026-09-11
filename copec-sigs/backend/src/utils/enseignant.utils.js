const prisma = require('../config/prisma');

async function obtenirClasseIdsEnseignant(req) {
  if (req.user.role !== 'ENSEIGNANT') return null;
  const enseignant = await prisma.enseignant.findUnique({ where: { utilisateurId: req.user.id } });
  if (!enseignant) return [];
  const seances = await prisma.emploiDuTemps.findMany({
    where: { enseignantId: enseignant.id },
    select: { classeId: true },
    distinct: ['classeId'],
  });
  return seances.map((s) => s.classeId);
}

async function enseignantEnseigneCetteMatiereDansCetteClasse(req, classeId, matiereId) {
  if (req.user.role !== 'ENSEIGNANT') return true;
  const enseignant = await prisma.enseignant.findUnique({ where: { utilisateurId: req.user.id } });
  if (!enseignant) return false;
  const seance = await prisma.emploiDuTemps.findFirst({
    where: { enseignantId: enseignant.id, classeId, matiereId },
  });
  return !!seance;
}

module.exports = { obtenirClasseIdsEnseignant, enseignantEnseigneCetteMatiereDansCetteClasse };