const prisma = require('../config/prisma');
const puppeteer = require('puppeteer');
const { genererHtmlRecu } = require('../services/pdf/recuTemplate');

/**
 * Génère un numéro de reçu séquentiel et lisible : REC-2026-00001
 * (pas garanti 100% concurrent-safe, mais largement suffisant pour
 * le volume d'un établissement scolaire avec un seul poste économe à la fois)
 */
async function genererNumeroRecu(etablissementId) {
  const annee = new Date().getFullYear();
  const total = await prisma.paiement.count({
    where: { eleve: { etablissementId } },
  });
  return `REC-${annee}-${String(total + 1).padStart(5, '0')}`;
}

/**
 * Calcule ce qu'un élève doit payer pour une année scolaire (via son niveau
 * et le BaremeFrais), combien il a déjà payé, et ce qu'il reste à payer.
 */
async function calculerSolde(eleveId, anneeScolaireId, etablissementId) {
  const inscription = await prisma.inscription.findFirst({
    where: { eleveId, anneeScolaireId },
    include: { classe: { include: { niveau: true } } },
  });
  if (!inscription) return null;

  const bareme = await prisma.baremeFrais.findFirst({
    where: { niveauId: inscription.classe.niveauId, anneeScolaireId },
  });

  const attendu = bareme ? bareme.droit + bareme.ecolage + bareme.fraisExamen : null;

  const paiements = await prisma.paiement.findMany({
    where: { eleveId, anneeScolaireId, statut: 'PAYE' },
  });
  const paye = paiements.reduce((acc, p) => acc + p.montant, 0);

  return {
    niveau: inscription.classe.niveau.libelle,
    bareme: bareme
      ? { droit: bareme.droit, ecolage: bareme.ecolage, fraisExamen: bareme.fraisExamen }
      : null,
    attendu,
    paye,
    reste: attendu !== null ? Math.max(0, attendu - paye) : null,
    soldeAJour: attendu !== null ? paye >= attendu : null,
  };
}

/**
 * GET /api/paiements/eleve/:eleveId/solde?anneeScolaireId=
 */
async function obtenirSolde(req, res, next) {
  try {
    const { anneeScolaireId } = req.query;
    if (!anneeScolaireId) return res.status(400).json({ error: 'anneeScolaireId requis' });

    const eleve = await prisma.eleve.findFirst({
      where: { id: req.params.eleveId, etablissementId: req.user.etablissementId },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });

    const solde = await calculerSolde(eleve.id, anneeScolaireId, req.user.etablissementId);
    if (!solde) return res.status(404).json({ error: "Aucune inscription trouvée pour cette année scolaire" });

    res.json(solde);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/paiements
 * Body: { eleveId, anneeScolaireId, typeFrais, montant, moyenPaiement }
 */
async function creer(req, res, next) {
  try {
    const { eleveId, anneeScolaireId, typeFrais, montant, moyenPaiement } = req.body;

    if (!eleveId || !anneeScolaireId || !typeFrais || montant === undefined) {
      return res.status(400).json({ error: 'Champs obligatoires manquants (eleveId, anneeScolaireId, typeFrais, montant)' });
    }
    if (typeof montant !== 'number' || montant <= 0) {
      return res.status(400).json({ error: 'Le montant doit être un nombre positif' });
    }

    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable dans cet établissement' });

    const numeroRecu = await genererNumeroRecu(req.user.etablissementId);

    const paiement = await prisma.paiement.create({
      data: { eleveId, anneeScolaireId, typeFrais, montant, moyenPaiement, numeroRecu },
    });

    res.status(201).json(paiement);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/paiements?eleveId=&anneeScolaireId=
 */
async function lister(req, res, next) {
  try {
    const { eleveId, anneeScolaireId } = req.query;

    const paiements = await prisma.paiement.findMany({
      where: {
        eleve: { etablissementId: req.user.etablissementId },
        ...(eleveId ? { eleveId } : {}),
        ...(anneeScolaireId ? { anneeScolaireId } : {}),
      },
      include: { eleve: true },
      orderBy: { datePaiement: 'desc' },
    });

    res.json(paiements);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/paiements/:id/recu
 * Génère le PDF du reçu pour un paiement donné.
 */
async function genererRecuPdf(req, res, next) {
  let navigateur;
  try {
    const paiement = await prisma.paiement.findFirst({
      where: { id: req.params.id, eleve: { etablissementId: req.user.etablissementId } },
      include: { eleve: { include: { etablissement: true, inscriptions: { include: { classe: true } } } } },
    });
    if (!paiement) return res.status(404).json({ error: 'Paiement introuvable' });

    const inscription = paiement.eleve.inscriptions.find((i) => i.anneeScolaireId === paiement.anneeScolaireId);

    const html = genererHtmlRecu({
      etablissement: paiement.eleve.etablissement,
      paiement,
      eleve: paiement.eleve,
      classe: inscription?.classe ?? null,
    });

    navigateur = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await navigateur.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfUint8Array = await page.pdf({ format: 'A5', printBackground: true });
    const pdfBuffer = Buffer.from(pdfUint8Array);
    await navigateur.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recu_${paiement.numeroRecu}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    if (navigateur) await navigateur.close().catch(() => {});
    next(err);
  }
}

module.exports = { creer, lister, obtenirSolde, calculerSolde, genererRecuPdf };