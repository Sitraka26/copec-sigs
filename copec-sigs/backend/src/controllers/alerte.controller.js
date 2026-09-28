const prisma = require('../config/prisma');

/**
 * GET /api/alertes
 * Retourne les alertes intelligentes selon le rôle de l'utilisateur.
 */
async function listerAlertes(req, res, next) {
  try {
    const etablissementId = req.user.etablissementId;
    const role = req.user.role;
    const alertes = [];

    const anneeActive = await prisma.anneeScolaire.findFirst({
      where: { etablissementId, active: true },
    });

    if (!anneeActive) {
      return res.json({ alertes: [], message: 'Aucune année scolaire active' });
    }

    // ========== 1. Absences répétées (7 derniers jours) ==========
    // Visible par : ADMIN, DIRECTEUR, SECRETAIRE, SURVEILLANT, ENSEIGNANT
    if (['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'SURVEILLANT', 'ENSEIGNANT'].includes(role)) {
      const ilYa7Jours = new Date();
      ilYa7Jours.setDate(ilYa7Jours.getDate() - 7);
      ilYa7Jours.setUTCHours(0, 0, 0, 0);

      const absences = await prisma.presence.groupBy({
        by: ['eleveId'],
        where: {
          statut: 'ABSENT',
          date: { gte: ilYa7Jours },
          eleve: { etablissementId },
        },
        _count: { id: true },
        having: {
          id: { _count: { gte: 3 } }, // 3 absences ou plus en 7 jours
        },
      });

      if (absences.length > 0) {
        const elevesIds = absences.map((a) => a.eleveId);
        const eleves = await prisma.eleve.findMany({
          where: { id: { in: elevesIds } },
          select: { id: true, nom: true, prenom: true, matricule: true },
        });

        eleves.forEach((e) => {
          const count = absences.find((a) => a.eleveId === e.id)?._count?.id || 0;
          alertes.push({
            type: 'ABSENCE_REPETEE',
            niveau: 'warning',
            titre: 'Absences répétées',
            message: `${e.prenom} ${e.nom} (${e.matricule}) a ${count} absences sur les 7 derniers jours`,
            eleveId: e.id,
            date: new Date().toISOString(),
          });
        });
      }
    }

    // ========== 2. Retards de paiement ==========
    // Visible par : ADMIN, DIRECTEUR, ECONOME, SECRETAIRE
    if (['ADMIN', 'DIRECTEUR', 'ECONOME', 'SECRETAIRE'].includes(role)) {
      const inscriptions = await prisma.inscription.findMany({
        where: { anneeScolaireId: anneeActive.id, statut: 'ACTIVE' },
        include: {
          eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
          classe: { include: { niveau: true } },
        },
      });

      const baremes = await prisma.baremeFrais.findMany({
        where: { anneeScolaireId: anneeActive.id },
      });
      const baremeParNiveau = {};
      baremes.forEach((b) => {
        baremeParNiveau[b.niveauId] = (b.droit || 0) + (b.ecolage || 0) + (b.fraisExamen || 0);
      });

      for (const ins of inscriptions) {
        const attendu = baremeParNiveau[ins.classe.niveauId] || 0;
        if (attendu <= 0) continue;

        const totalPaye = await prisma.paiement.aggregate({
          where: {
            eleveId: ins.eleveId,
            anneeScolaireId: anneeActive.id,
            statut: 'PAYE',
          },
          _sum: { montant: true },
        });

        const paye = totalPaye._sum.montant || 0;
        if (paye < attendu) {
          const reste = attendu - paye;
          alertes.push({
            type: 'RETARD_PAIEMENT',
            niveau: 'danger',
            titre: 'Retard de paiement',
            message: `${ins.eleve.prenom} ${ins.eleve.nom} (${ins.eleve.matricule}) — reste à payer : ${reste.toLocaleString('fr-FR')} Ar`,
            eleveId: ins.eleve.id,
            date: new Date().toISOString(),
          });
        }
      }
    }

    // ========== 3. Notes faibles (moyenne < 8 sur 20 sur la dernière période) ==========
    // Visible par : ADMIN, DIRECTEUR, ENSEIGNANT
    if (['ADMIN', 'DIRECTEUR', 'ENSEIGNANT'].includes(role)) {
      // On prend la période la plus récente qui a des notes
      const derniereNote = await prisma.note.findFirst({
        where: { eleve: { etablissementId } },
        orderBy: { periode: 'desc' },
        select: { periode: true },
      });

      if (derniereNote) {
        const notes = await prisma.note.findMany({
          where: {
            periode: derniereNote.periode,
            eleve: { etablissementId },
          },
          include: {
            eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
            matiere: { select: { coefficient: true } },
          },
        });

        // Calcul moyenne simple par élève
        const parEleve = {};
        notes.forEach((n) => {
          if (!parEleve[n.eleveId]) {
            parEleve[n.eleveId] = { total: 0, coef: 0, eleve: n.eleve };
          }
          const coef = n.matiere.coefficient || 1;
          parEleve[n.eleveId].total += n.valeur * coef;
          parEleve[n.eleveId].coef += coef;
        });

        Object.values(parEleve).forEach((data) => {
          if (data.coef > 0) {
            const moyenne = data.total / data.coef;
            if (moyenne < 8) {
              alertes.push({
                type: 'NOTE_FAIBLE',
                niveau: 'warning',
                titre: 'Moyenne faible',
                message: `${data.eleve.prenom} ${data.eleve.nom} (${data.eleve.matricule}) — moyenne période ${derniereNote.periode} : ${moyenne.toFixed(2)}/20`,
                eleveId: data.eleve.id,
                date: new Date().toISOString(),
              });
            }
          }
        });
      }
    }

    // On limite à 30 alertes max pour ne pas surcharger
    const alertesLimitees = alertes.slice(0, 30);

    res.json({
      total: alertesLimitees.length,
      alertes: alertesLimitees,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listerAlertes };