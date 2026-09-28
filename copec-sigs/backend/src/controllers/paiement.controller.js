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
  const droitPaye = paiements.filter((p) => p.typeFrais === 'DROIT').reduce((acc, p) => acc + p.montant, 0);
  const ecolagePaye = paiements.filter((p) => p.typeFrais === 'ECOLAGE').reduce((acc, p) => acc + p.montant, 0);

  return {
    niveau: inscription.classe.niveau.libelle,
    bareme: bareme
      ? { droit: bareme.droit, ecolage: bareme.ecolage, fraisExamen: bareme.fraisExamen }
      : null,
    attendu,
    paye,
    reste: attendu !== null ? Math.max(0, attendu - paye) : null,
    soldeAJour: attendu !== null ? paye >= attendu : null,
    droitAttendu: bareme?.droit ?? null,
    droitPaye,
    droitReste: bareme ? Math.max(0, bareme.droit - droitPaye) : null,
    ecolageAttendu: bareme?.ecolage ?? null,
    ecolagePaye,
    ecolageReste: bareme ? Math.max(0, bareme.ecolage - ecolagePaye) : null,
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
        // Audit
    const { enregistrerAudit } = require('../services/audit.service');
    await enregistrerAudit({
      etablissementId: req.user.etablissementId,
      utilisateurId: req.user.id,
      action: 'CREATE_PAIEMENT',
      entite: 'Paiement',
      entiteId: paiement.id,
      details: { eleveId, montant, typeFrais, numeroRecu: paiement.numeroRecu },
      ip: req.ip,
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

async function listerSituations(req, res, next) {
  try {
    const { anneeScolaireId } = req.query;
    if (!anneeScolaireId) return res.status(400).json({ error: 'anneeScolaireId requis' });

    const inscriptions = await prisma.inscription.findMany({
      where: { anneeScolaireId, statut: 'ACTIVE', classe: { etablissementId: req.user.etablissementId } },
      include: { eleve: true, classe: { include: { niveau: true } } },
      orderBy: [{ classe: { nom: 'asc' } }, { eleve: { nom: 'asc' } }],
    });
    const apresLe15 = new Date().getDate() >= 15;
    const situations = [];

    for (const inscription of inscriptions) {
      const bareme = await prisma.baremeFrais.findFirst({
        where: { niveauId: inscription.classe.niveauId, anneeScolaireId },
      });
      const paiements = await prisma.paiement.findMany({
        where: { eleveId: inscription.eleveId, anneeScolaireId, statut: 'PAYE' },
        select: { montant: true, typeFrais: true },
      });
      const droitPaye = paiements.filter((p) => p.typeFrais === 'DROIT').reduce((s, p) => s + p.montant, 0);
      const ecolagePaye = paiements.filter((p) => p.typeFrais === 'ECOLAGE').reduce((s, p) => s + p.montant, 0);
      const droitReste = bareme ? Math.max(0, bareme.droit - droitPaye) : null;
      const ecolageReste = bareme ? Math.max(0, bareme.ecolage - ecolagePaye) : null;

      situations.push({
        eleveId: inscription.eleveId,
        nom: inscription.eleve.nom,
        prenom: inscription.eleve.prenom,
        matricule: inscription.eleve.matricule,
        classe: inscription.classe.nom,
        droitReste,
        ecolageReste,
        droitImpayé: droitReste === null || droitReste > 0,
        ecolageAlerte: apresLe15 && ecolageReste !== null && ecolageReste > 0,
      });
    }
    res.json({ apresLe15, situations });
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

module.exports = { creer, lister, listerSituations, obtenirSolde, calculerSolde, genererRecuPdf };