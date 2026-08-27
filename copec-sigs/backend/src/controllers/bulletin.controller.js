const prisma = require('../config/prisma');
const puppeteer = require('puppeteer');
const { genererHtmlBulletin } = require('../services/pdf/bulletinTemplate');

/**
 * Calcule la moyenne pondérée d'un élève pour une période donnée,
 * à partir de ses notes et des coefficients de chaque matière.
 * Moyenne = somme(note * coefficient) / somme(coefficients)
 */
async function calculerMoyenneEleve(eleveId, periode) {
  const notes = await prisma.note.findMany({
    where: { eleveId, periode },
    include: { matiere: true },
  });

  if (notes.length === 0) return null;

  const totalPondere = notes.reduce((acc, n) => acc + n.valeur * n.matiere.coefficient, 0);
  const totalCoefficients = notes.reduce((acc, n) => acc + n.matiere.coefficient, 0);

  if (totalCoefficients === 0) return null;

  return Math.round((totalPondere / totalCoefficients) * 100) / 100; // arrondi à 2 décimales
}

/**
 * GET /api/bulletins/classe/:classeId/periode/:periode
 * Calcule (sans enregistrer) la moyenne et le rang de tous les élèves
 * d'une classe pour une période — utile pour prévisualiser avant de générer.
 */
async function apercuClasse(req, res, next) {
  try {
    const { classeId, periode } = req.params;
    const p = Number(periode);

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const inscriptions = await prisma.inscription.findMany({
      where: { classeId, statut: 'ACTIVE' },
      include: { eleve: true },
    });

    const resultats = [];
    for (const insc of inscriptions) {
      const moyenne = await calculerMoyenneEleve(insc.eleve.id, p);
      resultats.push({
        eleveId: insc.eleve.id,
        nom: insc.eleve.nom,
        prenom: insc.eleve.prenom,
        moyenne,
      });
    }

    // Classement : les élèves sans moyenne (notes incomplètes) sont mis en bas, non classés
    const classes = resultats.filter((r) => r.moyenne !== null).sort((a, b) => b.moyenne - a.moyenne);
    const nonClasses = resultats.filter((r) => r.moyenne === null);

    classes.forEach((r, index) => {
      r.rang = index + 1;
    });
    nonClasses.forEach((r) => {
      r.rang = null;
    });

    res.json({ periode: p, effectif: resultats.length, resultats: [...classes, ...nonClasses] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bulletins/generer
 * Body: { classeId, anneeScolaireId, periode }
 * Calcule ET enregistre les bulletins (moyenne + rang) de toute une classe
 * pour une période donnée. Idempotent : régénérer écrase l'ancien résultat
 * (utile si des notes ont été corrigées après une première génération).
 */
async function genererPourClasse(req, res, next) {
  try {
    const { classeId, anneeScolaireId, periode } = req.body;
    const p = Number(periode);

    if (!classeId || !anneeScolaireId || !periode) {
      return res.status(400).json({ error: 'classeId, anneeScolaireId et periode sont requis' });
    }

    const classe = await prisma.classe.findFirst({
      where: { id: classeId, etablissementId: req.user.etablissementId },
    });
    if (!classe) return res.status(404).json({ error: 'Classe introuvable' });

    const inscriptions = await prisma.inscription.findMany({
      where: { classeId, statut: 'ACTIVE' },
      include: { eleve: true },
    });

    if (inscriptions.length === 0) {
      return res.status(400).json({ error: 'Aucun élève inscrit dans cette classe' });
    }

    // Calcule la moyenne de chaque élève
    const resultats = [];
    for (const insc of inscriptions) {
      const moyenne = await calculerMoyenneEleve(insc.eleve.id, p);
      resultats.push({ eleveId: insc.eleve.id, moyenne });
    }

    // Classement
    const classesOk = resultats.filter((r) => r.moyenne !== null).sort((a, b) => b.moyenne - a.moyenne);
    classesOk.forEach((r, index) => (r.rang = index + 1));
    const sansMoyenne = resultats.filter((r) => r.moyenne === null);
    sansMoyenne.forEach((r) => (r.rang = null));

    const tousLesResultats = [...classesOk, ...sansMoyenne];

    // Enregistre (upsert) chaque bulletin
    const bulletins = await prisma.$transaction(
      tousLesResultats.map((r) =>
        prisma.bulletin.upsert({
          where: {
            eleveId_anneeScolaireId_periode: {
              eleveId: r.eleveId,
              anneeScolaireId,
              periode: p,
            },
          },
          update: { moyenneGenerale: r.moyenne, rang: r.rang, genereLe: new Date() },
          create: {
            eleveId: r.eleveId,
            anneeScolaireId,
            periode: p,
            moyenneGenerale: r.moyenne,
            rang: r.rang,
          },
        })
      )
    );

    res.json({ genere: bulletins.length, bulletins });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bulletins/eleve/:eleveId/periode/:periode
 * Détail complet du bulletin d'un élève : notes par matière + moyenne + rang.
 * C'est cette donnée qui alimentera le PDF (partie 2).
 */
async function detailBulletinEleve(req, res, next) {
  try {
    const { eleveId, periode } = req.params;
    const p = Number(periode);

    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
      include: {
        inscriptions: { where: { statut: 'ACTIVE' }, include: { classe: { include: { niveau: true } } } },
      },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });

    const notes = await prisma.note.findMany({
      where: { eleveId, periode: p },
      include: { matiere: true },
      orderBy: { matiere: { nom: 'asc' } },
    });

    const bulletin = await prisma.bulletin.findFirst({
      where: { eleveId, periode: p },
    });

    res.json({
      eleve: { id: eleve.id, matricule: eleve.matricule, nom: eleve.nom, prenom: eleve.prenom },
      classe: eleve.inscriptions[0]?.classe ?? null,
      periode: p,
      notes: notes.map((n) => ({
        matiere: n.matiere.nom,
        coefficient: n.matiere.coefficient,
        valeur: n.valeur,
      })),
      moyenneGenerale: bulletin?.moyenneGenerale ?? null,
      rang: bulletin?.rang ?? null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bulletins/eleve/:eleveId/annee/:anneeScolaireId/pdf
 * Génère le PDF du bulletin annuel complet (les 5 bimestres) d'un élève.
 * Suppose que genererPourClasse a déjà été appelé pour chaque période
 * concernée (sinon les moyennes/rangs de bimestre seront vides).
 */
async function genererPdfEleve(req, res, next) {
  let navigateur;
  try {
    const { eleveId, anneeScolaireId } = req.params;

    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
      include: {
        etablissement: true,
        inscriptions: {
          where: { anneeScolaireId },
          include: { classe: { include: { niveau: true } } },
        },
      },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });

    const inscription = eleve.inscriptions[0];
    if (!inscription) return res.status(404).json({ error: "Aucune inscription trouvée pour cette année scolaire" });

    const anneeScolaire = await prisma.anneeScolaire.findUnique({ where: { id: anneeScolaireId } });

    const matieres = await prisma.matiere.findMany({
      where: { etablissementId: req.user.etablissementId },
      orderBy: { nom: 'asc' },
    });

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

    // Moyenne annuelle = moyenne simple des moyennes de bimestre disponibles
    // ⚠️ Règle de calcul à reconfirmer avec l'école (hypothèse par défaut)
    const moyennesDisponibles = Object.values(bulletinsParPeriode)
      .map((b) => b.moyenneGenerale)
      .filter((m) => m !== null && m !== undefined);
    const moyenneAnnuelle =
      moyennesDisponibles.length > 0
        ? moyennesDisponibles.reduce((a, b) => a + b, 0) / moyennesDisponibles.length
        : null;

    const rangAnnuel = bulletinsParPeriode[5]?.rang ?? null; // approximation : rang du dernier bimestre

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

    navigateur = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await navigateur.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfUint8Array = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    const pdfBuffer = Buffer.from(pdfUint8Array); // conversion nécessaire : page.pdf() renvoie un Uint8Array, pas un vrai Buffer Node
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