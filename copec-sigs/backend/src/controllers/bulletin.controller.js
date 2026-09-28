const prisma = require('../config/prisma');
const puppeteer = require('puppeteer');
const { genererHtmlBulletin } = require('../services/pdf/bulletinTemplate');
const { obtenirCoefficientsPourNiveau } = require('./programme.controller');
const { obtenirClasseIdsEnseignant } = require('../utils/enseignant.utils');

async function calculerMoyenneEleve(eleveId, periode, niveauId, etablissementId) {
  const notes = await prisma.note.findMany({ where: { eleveId, periode } });
  if (notes.length === 0) return null;
  const coefficients = await obtenirCoefficientsPourNiveau(niveauId, etablissementId);
  const notesProgramme = notes.filter((note) => Object.prototype.hasOwnProperty.call(coefficients, note.matiereId));
  if (notesProgramme.length === 0) return null;
  const totalPondere = notesProgramme.reduce((acc, n) => acc + n.valeur * coefficients[n.matiereId], 0);
  const totalCoefficients = notesProgramme.reduce((acc, n) => acc + coefficients[n.matiereId], 0);
  if (totalCoefficients === 0) return null;
  return Math.round((totalPondere / totalCoefficients) * 100) / 100;
}

async function apercuClasse(req, res, next) {
  try {
    const { classeId, periode } = req.params;
    const p = Number(periode);

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
      include: { niveau: true },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);
    if (classeIdsEnseignant !== null && !classeIdsEnseignant.includes(classeId)) {
      return res.status(403).json({ error: "Vous n'enseignez pas dans cette classe" });
    }

    const inscriptions = await prisma.inscription.findMany({
      where: { classeId, statut: 'ACTIVE' },
      include: { eleve: true },
    });

    const resultats = [];
    for (const insc of inscriptions) {
      const moyenne = await calculerMoyenneEleve(insc.eleve.id, p, classe.niveauId, req.user.etablissementId);
      resultats.push({ eleveId: insc.eleve.id, nom: insc.eleve.nom, prenom: insc.eleve.prenom, moyenne });
    }

    const classes = resultats.filter((r) => r.moyenne !== null).sort((a, b) => b.moyenne - a.moyenne);
    const nonClasses = resultats.filter((r) => r.moyenne === null);
    classes.forEach((r, index) => { r.rang = index + 1; });
    nonClasses.forEach((r) => { r.rang = null; });

    res.json({ periode: p, effectif: resultats.length, resultats: [...classes, ...nonClasses] });
  } catch (err) {
    next(err);
  }
}

async function genererPourClasse(req, res, next) {
  try {
    const { classeId, anneeScolaireId, periode } = req.body;
    const p = Number(periode);

    if (!classeId || !anneeScolaireId || !periode) {
      return res.status(400).json({ error: 'classeId, anneeScolaireId et periode sont requis' });
    }

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
      include: { niveau: true },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const inscriptions = await prisma.inscription.findMany({
      where: { classeId, statut: 'ACTIVE' },
      include: { eleve: true },
    });
    if (inscriptions.length === 0) {
      return res.status(400).json({ error: 'Aucun élève inscrit dans cette classe' });
    }

    const resultats = [];
    for (const insc of inscriptions) {
      const moyenne = await calculerMoyenneEleve(insc.eleve.id, p, classe.niveauId, req.user.etablissementId);
      resultats.push({ eleveId: insc.eleve.id, moyenne });
    }

    const classesOk = resultats.filter((r) => r.moyenne !== null).sort((a, b) => b.moyenne - a.moyenne);
    classesOk.forEach((r, index) => (r.rang = index + 1));
    const sansMoyenne = resultats.filter((r) => r.moyenne === null);
    sansMoyenne.forEach((r) => (r.rang = null));
    const tousLesResultats = [...classesOk, ...sansMoyenne];

    const bulletins = await prisma.$transaction(
      tousLesResultats.map((r) =>
        prisma.bulletin.upsert({
          where: { eleveId_anneeScolaireId_periode: { eleveId: r.eleveId, anneeScolaireId, periode: p } },
          update: { moyenneGenerale: r.moyenne, rang: r.rang, genereLe: new Date() },
          create: { eleveId: r.eleveId, anneeScolaireId, periode: p, moyenneGenerale: r.moyenne, rang: r.rang },
        })
      )
    );

    res.json({ genere: bulletins.length, bulletins });
  } catch (err) {
    next(err);
  }
}

async function detailBulletinEleve(req, res, next) {
  try {
    const { eleveId, periode } = req.params;
    const p = Number(periode);

    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
      include: { inscriptions: { where: { statut: 'ACTIVE' }, include: { classe: { include: { niveau: true } } } } },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });

    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);
    if (classeIdsEnseignant !== null) {
      const classeElevId = eleve.inscriptions[0]?.classeId;
      if (!classeElevId || !classeIdsEnseignant.includes(classeElevId)) {
        return res.status(403).json({ error: "Cet élève n'est pas dans une de vos classes" });
      }
    }

    const niveauId = eleve.inscriptions[0]?.classe?.niveauId;
    const coefficients = niveauId ? await obtenirCoefficientsPourNiveau(niveauId, req.user.etablissementId) : {};

    const notes = await prisma.note.findMany({
      where: { eleveId, periode: p, matiereId: { in: Object.keys(coefficients) } },
      include: { matiere: true },
      orderBy: { matiere: { nom: 'asc' } },
    });

    const bulletin = await prisma.bulletin.findFirst({ where: { eleveId, periode: p } });

    res.json({
      eleve: { id: eleve.id, matricule: eleve.matricule, nom: eleve.nom, prenom: eleve.prenom },
      classe: eleve.inscriptions[0]?.classe ?? null,
      periode: p,
      notes: notes.map((n) => ({
        matiere: n.matiere.nom,
        coefficient: coefficients[n.matiereId] ?? n.matiere.coefficient,
        valeur: n.valeur,
      })),
      moyenneGenerale: bulletin?.moyenneGenerale ?? null,
      rang: bulletin?.rang ?? null,
    });
  } catch (err) {
    next(err);
  }
}

async function genererPdfEleve(req, res, next) {
  let navigateur;
  try {
    const { eleveId, anneeScolaireId } = req.params;

    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
      include: {
        etablissement: true,
        inscriptions: { where: { anneeScolaireId }, include: { classe: { include: { niveau: true } } } },
      },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });

    const inscription = eleve.inscriptions[0];
    if (!inscription) return res.status(404).json({ error: "Aucune inscription trouvée pour cette année scolaire" });

    const classeIdsEnseignant = await obtenirClasseIdsEnseignant(req);
    if (classeIdsEnseignant !== null && !classeIdsEnseignant.includes(inscription.classeId)) {
      return res.status(403).json({ error: "Cet élève n'est pas dans une de vos classes" });
    }

    const anneeScolaire = await prisma.anneeScolaire.findUnique({ where: { id: anneeScolaireId } });

    const coefficients = await obtenirCoefficientsPourNiveau(inscription.classe.niveauId, req.user.etablissementId);
    const matieresBrutes = await prisma.matiere.findMany({
      where: { etablissementId: req.user.etablissementId, id: { in: Object.keys(coefficients) } },
      orderBy: { nom: 'asc' },
    });

    const matieres = matieresBrutes.map((m) => ({ ...m, coefficient: coefficients[m.id] ?? m.coefficient }));

    const notes = await prisma.note.findMany({ where: { eleveId } });
    const notesParMatierePeriode = {};
    for (const n of notes) {
      if (!notesParMatierePeriode[n.matiereId]) notesParMatierePeriode[n.matiereId] = {};
      notesParMatierePeriode[n.matiereId][n.periode] = n.valeur;
    }

    const bulletins = await prisma.bulletin.findMany({ where: { eleveId, anneeScolaireId } });
    const bulletinsParPeriode = {};
    for (const b of bulletins) {
      bulletinsParPeriode[b.periode] = { moyenneGenerale: b.moyenneGenerale, rang: b.rang };
    }

    const effectifClasse = await prisma.inscription.count({
      where: { classeId: inscription.classeId, statut: 'ACTIVE' },
    });

    const moyennesDisponibles = Object.values(bulletinsParPeriode)
      .map((b) => b.moyenneGenerale)
      .filter((m) => m !== null && m !== undefined);
    const moyenneAnnuelle =
      moyennesDisponibles.length > 0
        ? moyennesDisponibles.reduce((a, b) => a + b, 0) / moyennesDisponibles.length
        : null;

    const rangAnnuel = bulletinsParPeriode[5]?.rang ?? null;

    const html = genererHtmlBulletin({
      etablissement: eleve.etablissement,
      eleve,
      classe: inscription.classe,
      anneeScolaire,
      matieres,
      notesParMatierePeriode,
      bulletinsParPeriode,
      moyenneAnnuelle,
      rangAnnuel,
      effectifClasse,
    });

    navigateur = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', '--disable-background-networking', '--disable-component-update',
        '--disable-domain-reliability', '--disable-client-side-phishing-detection',
        '--disable-sync', '--disable-default-apps', '--no-first-run',
      ],
    });
    const page = await navigateur.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfUint8Array = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    const pdfBuffer = Buffer.from(pdfUint8Array);
    await navigateur.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bulletin_${eleve.matricule}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    if (navigateur) await navigateur.close().catch(() => {});
    next(err);
  }
}

module.exports = { apercuClasse, genererPourClasse, detailBulletinEleve, calculerMoyenneEleve, genererPdfEleve };