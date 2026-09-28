const XLSX = require('xlsx');
const prisma = require('../config/prisma');

function envoyerExcel(res, lignes, nomFeuille, nomFichier) {
  const feuille = XLSX.utils.json_to_sheet(lignes);
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, nomFeuille);
  const buffer = XLSX.write(classeur, { type: 'buffer', bookType: 'xlsx' });
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${nomFichier}"`,
  });
  res.send(buffer);
}

async function exporterEleves(req, res, next) {
  try {
    const eleves = await prisma.eleve.findMany({
      where: { etablissementId: req.user.etablissementId },
      include: {
        inscriptions: {
          where: { statut: 'ACTIVE' },
          include: { classe: { include: { niveau: true } } },
        },
      },
      orderBy: { nom: 'asc' },
    });

    const lignes = eleves.map((e) => ({
      Matricule: e.matricule,
      Nom: e.nom,
      Prénom: e.prenom,
      Sexe: e.sexe,
      'Date de naissance': e.dateNaissance ? new Date(e.dateNaissance).toLocaleDateString('fr-FR') : '',
      Classe: e.inscriptions[0]?.classe?.nom || '',
      Niveau: e.inscriptions[0]?.classe?.niveau?.libelle || '',
      Adresse: e.adresse || '',
      'Contact urgence': e.contactUrgenceTel || '',
    }));

    envoyerExcel(res, lignes, 'Élèves', 'eleves.xlsx');
  } catch (err) {
    next(err);
  }
}

async function exporterPaiements(req, res, next) {
  try {
    const { anneeScolaireId } = req.query;
    if (!anneeScolaireId) return res.status(400).json({ error: 'anneeScolaireId requis' });

    const paiements = await prisma.paiement.findMany({
      where: { anneeScolaireId, eleve: { etablissementId: req.user.etablissementId } },
      include: { eleve: true },
      orderBy: { datePaiement: 'desc' },
    });

    const lignes = paiements.map((p) => ({
      'N° Reçu': p.numeroRecu || '',
      Date: new Date(p.datePaiement).toLocaleDateString('fr-FR'),
      Élève: `${p.eleve.nom} ${p.eleve.prenom}`,
      Matricule: p.eleve.matricule,
      Nature: p.typeFrais,
      Montant: p.montant,
      'Moyen de paiement': p.moyenPaiement || '',
      Statut: p.statut,
    }));

    envoyerExcel(res, lignes, 'Paiements', 'paiements.xlsx');
  } catch (err) {
    next(err);
  }
}

async function obtenirSynthese(req, res, next) {
  try {
    const { anneeScolaireId } = req.query;
    if (!anneeScolaireId) return res.status(400).json({ error: 'anneeScolaireId requis' });

    const inscriptions = await prisma.inscription.findMany({
      where: { anneeScolaireId, statut: 'ACTIVE', classe: { etablissementId: req.user.etablissementId } },
      include: { eleve: true, classe: { include: { niveau: true } } },
    });
    const eleveIds = inscriptions.map((inscription) => inscription.eleveId);
    const [paiements, notes, presences] = await Promise.all([
      prisma.paiement.findMany({
        where: { anneeScolaireId, eleve: { etablissementId: req.user.etablissementId } },
      }),
      prisma.note.findMany({ where: { eleveId: { in: eleveIds } } }),
      prisma.presence.findMany({ where: { eleveId: { in: eleveIds } } }),
    ]);

    const paiementsPayes = paiements.filter((paiement) => paiement.statut === 'PAYE');
    const notesValides = notes.filter((note) => Number.isFinite(note.valeur));
    const moyenne = notesValides.length
      ? notesValides.reduce((total, note) => total + note.valeur, 0) / notesValides.length
      : null;
    const absences = presences.filter((presence) => presence.statut === 'ABSENT').length;
    const retards = presences.filter((presence) => presence.statut === 'RETARD').length;

    const peutVoirFinances = ['ADMIN', 'DIRECTEUR', 'ECONOME'].includes(req.user.role);
    res.json({
      eleves: inscriptions.length,
      classes: new Set(inscriptions.map((inscription) => inscription.classeId)).size,
      paiements: peutVoirFinances ? {
        total: paiementsPayes.reduce((total, paiement) => total + paiement.montant, 0),
        nombre: paiementsPayes.length,
        droit: paiementsPayes.filter((paiement) => paiement.typeFrais === 'DROIT').reduce((total, paiement) => total + paiement.montant, 0),
        ecolage: paiementsPayes.filter((paiement) => paiement.typeFrais === 'ECOLAGE').reduce((total, paiement) => total + paiement.montant, 0),
      } : null,
      scolarite: {
        notes: notesValides.length,
        moyenne: moyenne === null ? null : Math.round(moyenne * 100) / 100,
        absences,
        retards,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function exporterAbsences(req, res, next) {
  try {
    const { anneeScolaireId } = req.query;
    if (!anneeScolaireId) return res.status(400).json({ error: 'anneeScolaireId requis' });
    const inscriptions = await prisma.inscription.findMany({
      where: { anneeScolaireId, statut: 'ACTIVE', classe: { etablissementId: req.user.etablissementId } },
      include: { eleve: true, classe: true },
    });
    const eleveIds = inscriptions.map((inscription) => inscription.eleveId);
    const presences = await prisma.presence.findMany({
      where: { eleveId: { in: eleveIds }, statut: { in: ['ABSENT', 'RETARD'] } },
      orderBy: [{ date: 'desc' }],
    });
    const inscriptionParEleve = new Map(inscriptions.map((inscription) => [inscription.eleveId, inscription]));
    const lignes = presences.map((presence) => {
      const inscription = inscriptionParEleve.get(presence.eleveId);
      return {
        Date: new Date(presence.date).toLocaleDateString('fr-FR'),
        Élève: `${inscription.eleve.nom} ${inscription.eleve.prenom}`,
        Matricule: inscription.eleve.matricule,
        Classe: inscription.classe.nom,
        Statut: presence.statut === 'ABSENT' ? 'Absent' : 'Retard',
        Justifiée: presence.justifie ? 'Oui' : 'Non',
        'Contact urgence': inscription.eleve.contactUrgenceTel || '',
      };
    });
    envoyerExcel(res, lignes, 'Absences', 'absences.xlsx');
  } catch (err) {
    next(err);
  }
}

async function exporterResultats(req, res, next) {
  try {
    const { anneeScolaireId, periode = '1' } = req.query;
    const periodeNombre = Number(periode);
    if (!anneeScolaireId) return res.status(400).json({ error: 'anneeScolaireId requis' });
    if (!Number.isInteger(periodeNombre) || periodeNombre < 1 || periodeNombre > 5) {
      return res.status(400).json({ error: 'La période doit être un bimestre entre 1 et 5' });
    }
    const inscriptions = await prisma.inscription.findMany({
      where: { anneeScolaireId, statut: 'ACTIVE', classe: { etablissementId: req.user.etablissementId } },
      include: { eleve: true, classe: { include: { niveau: true } } },
    });
    const notes = await prisma.note.findMany({
      where: { periode: periodeNombre, eleveId: { in: inscriptions.map((inscription) => inscription.eleveId) } },
      include: { matiere: true },
    });
    const notesParEleve = new Map();
    notes.forEach((note) => {
      if (!notesParEleve.has(note.eleveId)) notesParEleve.set(note.eleveId, []);
      notesParEleve.get(note.eleveId).push(note);
    });
    const lignes = inscriptions.map((inscription) => {
      const notesEleve = notesParEleve.get(inscription.eleveId) || [];
      const moyenne = notesEleve.length
        ? notesEleve.reduce((total, note) => total + note.valeur, 0) / notesEleve.length
        : null;
      return {
        Élève: `${inscription.eleve.nom} ${inscription.eleve.prenom}`,
        Matricule: inscription.eleve.matricule,
        Classe: inscription.classe.nom,
        Niveau: inscription.classe.niveau.libelle,
        Bimestre: periodeNombre,
        'Nombre de notes': notesEleve.length,
        Moyenne: moyenne === null ? '' : Math.round(moyenne * 100) / 100,
      };
    }).sort((a, b) => (b.Moyenne || -1) - (a.Moyenne || -1));
    envoyerExcel(res, lignes, 'Résultats', `resultats-bimestre-${periodeNombre}.xlsx`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exporterEleves,
  exporterPaiements,
  obtenirSynthese,
  exporterAbsences,
  exporterResultats,
};