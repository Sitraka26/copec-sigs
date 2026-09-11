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

// Rôles qui n'ont RIEN à voir avec les chiffres financiers de l'école
const ROLES_SANS_ACCES_FINANCES = ['ENSEIGNANT', 'SURVEILLANT'];

async function obtenirStatistiques(req, res, next) {
  try {
    const etablissementId = req.user.etablissementId;
    const accesFinances = !ROLES_SANS_ACCES_FINANCES.includes(req.user.role);

    const anneeActive = await prisma.anneeScolaire.findFirst({ where: { etablissementId, active: true } });
    if (!anneeActive) {
      return res.json({ anneeActive: null, message: "Aucune année scolaire active n'est configurée." });
    }

    const inscriptions = await prisma.inscription.findMany({
      where: { anneeScolaireId: anneeActive.id, statut: 'ACTIVE' },
      include: { classe: { include: { niveau: true } } },
    });
    const effectifTotal = inscriptions.length;

    const nombreClasses = await prisma.classe.count({ where: { anneeScolaireId: anneeActive.id, etablissementId } });
    const nombreEnseignants = await prisma.enseignant.count({ where: { utilisateur: { etablissementId } } });

    const presencesJour = await prisma.presence.findMany({
      where: { date: debutDeAujourdhui(), eleve: { etablissementId } },
    });
    const presencesParStatut = { PRESENT: 0, ABSENT: 0, RETARD: 0 };
    presencesJour.forEach((p) => { presencesParStatut[p.statut] = (presencesParStatut[p.statut] || 0) + 1; });

    const reponse = {
      anneeActive: anneeActive.libelle,
      effectifTotal,
      nombreClasses,
      nombreEnseignants,
      presencesJour: presencesParStatut,
    };

    if (accesFinances) {
      const paiementsMois = await prisma.paiement.aggregate({
        where: { eleve: { etablissementId }, datePaiement: { gte: debutDuMois() }, statut: 'PAYE' },
        _sum: { montant: true },
        _count: true,
      });

      const baremes = await prisma.baremeFrais.findMany({ where: { anneeScolaireId: anneeActive.id } });
      const baremeParNiveau = {};
      baremes.forEach((b) => { baremeParNiveau[b.niveauId] = b.droit + b.ecolage + b.fraisExamen; });
      let totalAttendu = 0;
      inscriptions.forEach((i) => { totalAttendu += baremeParNiveau[i.classe.niveauId] ?? 0; });

      const totalPayeAnnee = await prisma.paiement.aggregate({
        where: { anneeScolaireId: anneeActive.id, statut: 'PAYE' },
        _sum: { montant: true },
      });
      const soldeGlobalDu = totalAttendu - (totalPayeAnnee._sum.montant ?? 0);

      reponse.paiementsMois = { total: paiementsMois._sum.montant ?? 0, nombre: paiementsMois._count };
      reponse.soldeGlobalDu = Math.max(0, soldeGlobalDu);
    }

    res.json(reponse);
  } catch (err) {
    next(err);
  }
}

async function obtenirIndicateurs(req, res, next) {
  try {
    const etablissementId = req.user.etablissementId;
    const accesFinances = !ROLES_SANS_ACCES_FINANCES.includes(req.user.role);

    const anneeActive = await prisma.anneeScolaire.findFirst({ where: { etablissementId, active: true } });
    if (!anneeActive) return res.json({ anneeActive: null });

    const bulletins = await prisma.bulletin.findMany({
      where: { anneeScolaireId: anneeActive.id, eleve: { etablissementId }, moyenneGenerale: { not: null } },
      include: { eleve: true },
    });
    const evolutionMoyennes = [1, 2, 3, 4, 5].map((p) => {
      const valeurs = bulletins.filter((b) => b.periode === p).map((b) => b.moyenneGenerale);
      const moyenne = valeurs.length > 0 ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : null;
      return { periode: p, moyenne: moyenne !== null ? Math.round(moyenne * 100) / 100 : null, effectif: valeurs.length };
    });

    const moyennesParEleve = {};
    bulletins.forEach((b) => {
      if (!moyennesParEleve[b.eleveId]) moyennesParEleve[b.eleveId] = { eleve: b.eleve, valeurs: [] };
      moyennesParEleve[b.eleveId].valeurs.push(b.moyenneGenerale);
    });
    const palmares = Object.values(moyennesParEleve)
      .map((e) => ({
        eleveId: e.eleve.id, nom: e.eleve.nom, prenom: e.eleve.prenom,
        moyenne: Math.round((e.valeurs.reduce((a, b) => a + b, 0) / e.valeurs.length) * 100) / 100,
      }))
      .sort((a, b) => b.moyenne - a.moyenne)
      .slice(0, 5);

    const inscriptions = await prisma.inscription.findMany({
      where: { anneeScolaireId: anneeActive.id, statut: 'ACTIVE' },
      include: { eleve: true, classe: true },
    });
    const absences = await prisma.presence.findMany({
      where: {
        eleve: { etablissementId }, statut: 'ABSENT', justifie: false,
        date: { gte: anneeActive.dateDebut, lte: anneeActive.dateFin },
      },
    });
    const absencesParEleve = {};
    absences.forEach((a) => { absencesParEleve[a.eleveId] = (absencesParEleve[a.eleveId] || 0) + 1; });

    const elevesARisque = [];
    for (const insc of inscriptions) {
      const bulletinsEleve = bulletins.filter((b) => b.eleveId === insc.eleve.id).sort((a, b) => b.periode - a.periode);
      const derniereMoyenne = bulletinsEleve[0]?.moyenneGenerale ?? null;
      const nbAbsences = absencesParEleve[insc.eleve.id] || 0;
      const raisons = [];
      if (derniereMoyenne !== null && derniereMoyenne < 10) raisons.push(`Moyenne faible (${derniereMoyenne.toFixed(2)}/20)`);
      if (nbAbsences >= 3) raisons.push(`${nbAbsences} absences non justifiées`);
      if (raisons.length > 0) {
        elevesARisque.push({
          eleveId: insc.eleve.id, nom: insc.eleve.nom, prenom: insc.eleve.prenom, classe: insc.classe.nom, raisons,
        });
      }
    }

    const notes = await prisma.note.findMany({ where: { eleve: { etablissementId } }, include: { matiere: true } });
    const notesParMatiere = {};
    notes.forEach((n) => {
      if (!notesParMatiere[n.matiereId]) notesParMatiere[n.matiereId] = { nom: n.matiere.nom, valeurs: [] };
      notesParMatiere[n.matiereId].valeurs.push(n.valeur);
    });
    const moyennesMatieres = Object.values(notesParMatiere)
      .map((m) => ({ nom: m.nom, moyenne: Math.round((m.valeurs.reduce((a, b) => a + b, 0) / m.valeurs.length) * 100) / 100 }))
      .sort((a, b) => a.moyenne - b.moyenne);

    const reponse = {
      anneeActive: anneeActive.libelle,
      evolutionMoyennes,
      palmares,
      elevesARisque,
      matierePlusDifficile: moyennesMatieres[0] || null,
      matierePlusForte: moyennesMatieres.length > 0 ? moyennesMatieres[moyennesMatieres.length - 1] : null,
    };

    if (accesFinances) {
      const baremes = await prisma.baremeFrais.findMany({ where: { anneeScolaireId: anneeActive.id } });
      const baremeParNiveau = {};
      baremes.forEach((b) => { baremeParNiveau[b.niveauId] = b.droit + b.ecolage + b.fraisExamen; });

      const paiements = await prisma.paiement.findMany({
        where: { anneeScolaireId: anneeActive.id, statut: 'PAYE', eleve: { etablissementId } },
      });
      const payeParEleve = {};
      paiements.forEach((p) => { payeParEleve[p.eleveId] = (payeParEleve[p.eleveId] || 0) + p.montant; });

      reponse.retardsPaiement = inscriptions
        .map((insc) => {
          const attendu = baremeParNiveau[insc.classe.niveauId] ?? 0;
          const paye = payeParEleve[insc.eleve.id] || 0;
          return { eleveId: insc.eleve.id, nom: insc.eleve.nom, prenom: insc.eleve.prenom, classe: insc.classe.nom, reste: attendu - paye };
        })
        .filter((e) => e.reste > 0)
        .sort((a, b) => b.reste - a.reste)
        .slice(0, 5);
    }

    res.json(reponse);
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenirStatistiques, obtenirIndicateurs };