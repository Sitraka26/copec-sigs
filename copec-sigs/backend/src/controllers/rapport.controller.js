const XLSX = require('xlsx');
const prisma = require('../config/prisma');

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

    const feuille = XLSX.utils.json_to_sheet(lignes);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, 'Élèves');
    const buffer = XLSX.write(classeur, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="eleves.xlsx"',
    });
    res.send(buffer);
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

    const feuille = XLSX.utils.json_to_sheet(lignes);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, 'Paiements');
    const buffer = XLSX.write(classeur, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="paiements.xlsx"',
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { exporterEleves, exporterPaiements };