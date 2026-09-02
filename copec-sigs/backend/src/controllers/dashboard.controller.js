const prisma = require('../config/prisma');

function debutDeAujourdhui() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function debutDuMois() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * GET /api/dashboard/stats
 * Vue d'ensemble de l'établissement pour l'année scolaire active :
 * effectif, classes, enseignants, présences du jour, paiements du mois,
 * et le solde global encore dû par l'ensemble des élèves.
 */
async function obtenirStatistiques(req, res, next) {
  try {
    const etablissementId = req.user.etablissementId;

    const anneeActive = await prisma.anneeScolaire.findFirst({
      where: { etablissementId, active: true },
    });

    if (!anneeActive) {
      return res.json({
        anneeActive: null,
        message: "Aucune année scolaire active n'est configurée.",
      });
    }

    const inscriptions = await prisma.inscription.findMany({
      where: { anneeScolaireId: anneeActive.id, statut: 'ACTIVE' },
      include: { classe: { include: { niveau: true } } },
    });
    const effectifTotal = inscriptions.length;

    const nombreClasses = await prisma.classe.count({
      where: { anneeScolaireId: anneeActive.id, etablissementId },
    });

    const nombreEnseignants = await prisma.enseignant.count({
      where: { utilisateur: { etablissementId } },
    });

    // Présences du jour
    const presencesJour = await prisma.presence.findMany({
      where: {
        date: debutDeAujourdhui(),
        eleve: { etablissementId },
      },
    });
    const presencesParStatut = { PRESENT: 0, ABSENT: 0, RETARD: 0 };
    presencesJour.forEach((p) => {
      presencesParStatut[p.statut] = (presencesParStatut[p.statut] || 0) + 1;
    });

    // Paiements du mois en cours
    const paiementsMois = await prisma.paiement.aggregate({
      where: {
        eleve: { etablissementId },
        datePaiement: { gte: debutDuMois() },
        statut: 'PAYE',
      },
      _sum: { montant: true },
      _count: true,
    });

    // Solde global dû sur toute l'année (attendu selon le barème - déjà payé)
    const baremes = await prisma.baremeFrais.findMany({ where: { anneeScolaireId: anneeActive.id } });
    const baremeParNiveau = {};
    baremes.forEach((b) => {
      baremeParNiveau[b.niveauId] = b.droit + b.ecolage + b.fraisExamen;
    });
    let totalAttendu = 0;
    inscriptions.forEach((i) => {
      totalAttendu += baremeParNiveau[i.classe.niveauId] ?? 0;
    });

    const totalPayeAnnee = await prisma.paiement.aggregate({
      where: { anneeScolaireId: anneeActive.id, statut: 'PAYE' },
      _sum: { montant: true },
    });
    const soldeGlobalDu = totalAttendu - (totalPayeAnnee._sum.montant ?? 0);

    res.json({
      anneeActive: anneeActive.libelle,
      effectifTotal,
      nombreClasses,
      nombreEnseignants,
      presencesJour: presencesParStatut,
      paiementsMois: {
        total: paiementsMois._sum.montant ?? 0,
        nombre: paiementsMois._count,
      },
      soldeGlobalDu: Math.max(0, soldeGlobalDu),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenirStatistiques };