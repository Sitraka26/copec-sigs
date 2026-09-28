const prisma = require('../config/prisma');
const puppeteer = require('puppeteer');
const { genererHtmlCertificat } = require('../services/pdf/certificatTemplate');
const { genererAppreciation } = require('../services/appreciation.service');

const MAX_CERTIFICATS_PAR_MOIS = 3;
const TYPES_AVEC_VALIDATION = ['ASSIDUITE', 'REUSSITE'];

function debutDuMois() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function verifierLimiteMensuelle(eleveId, etablissementId) {
  const debut = debutDuMois();
  const count = await prisma.certificatDemande.count({
    where: {
      eleveId,
      etablissementId,
      createdAt: { gte: debut },
      statut: { in: ['EN_ATTENTE', 'APPROUVE'] },
    },
  });
  return count < MAX_CERTIFICATS_PAR_MOIS;
}

async function verifierReglesMetier(eleve, inscription, type) {
  const eleveId = eleve.id;
  const anneeScolaireId = inscription.anneeScolaireId;
  const niveauId = inscription.classe.niveauId;

  if (type === 'SCOLARITE') {
    const bareme = await prisma.baremeFrais.findFirst({
      where: { anneeScolaireId, niveauId },
    });
    const attendu = bareme
      ? (bareme.droit || 0) + (bareme.ecolage || 0) + (bareme.fraisExamen || 0)
      : 0;
    const totalPaye = await prisma.paiement.aggregate({
      where: { eleveId, anneeScolaireId, statut: 'PAYE' },
      _sum: { montant: true },
    });
    const paye = totalPaye._sum.montant || 0;
    if (attendu > 0 && paye < attendu) {
      const reste = attendu - paye;
      return `Certificat de scolarité refusé : frais non soldés (reste : ${reste.toLocaleString('fr-FR')} Ar).`;
    }
  }

  if (type === 'REUSSITE') {
    const notes = await prisma.note.findMany({
      where: { eleveId },
      include: { matiere: { select: { coefficient: true } } },
    });
    if (notes.length === 0) {
      return 'Certificat de réussite refusé : aucune note enregistrée.';
    }
    let total = 0;
    let coef = 0;
    notes.forEach((n) => {
      const c = n.matiere?.coefficient || 1;
      total += n.valeur * c;
      coef += c;
    });
    const moyenne = coef > 0 ? total / coef : 0;
    if (moyenne < 10) {
      return `Certificat de réussite refusé : moyenne insuffisante (${moyenne.toFixed(2)}/20). Minimum : 10/20.`;
    }
  }

  if (type === 'ASSIDUITE') {
    const nbAbsences = await prisma.presence.count({
      where: { eleveId, statut: 'ABSENT', justifie: false },
    });
    if (nbAbsences >= 10) {
      return `Certificat d'assiduité refusé : ${nbAbsences} absences non justifiées (max 9).`;
    }
  }

  return null;
}

async function genererPdfBuffer(etablissement, eleve, inscription, type) {
  const html = genererHtmlCertificat({
    etablissement,
    eleve,
    classe: inscription.classe,
    anneeScolaire: inscription.anneeScolaire,
    type,
  });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return Buffer.from(pdf);
}

/**
 * POST /api/certificats/generer
 * SCOLARITE → PDF direct (si règles OK)
 * ASSIDUITE / REUSSITE → crée une demande EN_ATTENTE (sauf si ADMIN/DIRECTEUR)
 */
async function genererCertificat(req, res, next) {
  try {
    const { eleveId, type = 'SCOLARITE' } = req.body;
    if (!eleveId) return res.status(400).json({ error: 'eleveId requis' });

    const typesValides = ['SCOLARITE', 'ASSIDUITE', 'REUSSITE'];
    if (!typesValides.includes(type)) {
      return res.status(400).json({ error: 'Type de certificat invalide' });
    }

    const eleve = await prisma.eleve.findFirst({
      where: { id: eleveId, etablissementId: req.user.etablissementId },
      include: {
        inscriptions: {
          where: { statut: 'ACTIVE' },
          include: {
            classe: { include: { niveau: true } },
            anneeScolaire: true,
          },
          take: 1,
        },
      },
    });
    if (!eleve) return res.status(404).json({ error: 'Élève introuvable' });

    const inscription = eleve.inscriptions[0];
    if (!inscription) {
      return res.status(400).json({ error: 'Aucune inscription active pour cet élève' });
    }

    // Limite mensuelle
    const okLimite = await verifierLimiteMensuelle(eleveId, req.user.etablissementId);
    if (!okLimite) {
      return res.status(403).json({
        error: `Limite atteinte : maximum ${MAX_CERTIFICATS_PAR_MOIS} certificats par élève et par mois.`,
      });
    }

    // Règles métier (frais, moyenne, absences)
    const erreurRegle = await verifierReglesMetier(eleve, inscription, type);
    if (erreurRegle) {
      return res.status(403).json({ error: erreurRegle });
    }

    const besoinValidation = TYPES_AVEC_VALIDATION.includes(type);
    const estDirecteur = ['ADMIN', 'DIRECTEUR'].includes(req.user.role);

    // Types avec validation : SECRETAIRE crée une demande
    if (besoinValidation && !estDirecteur) {
      const demande = await prisma.certificatDemande.create({
        data: {
          etablissementId: req.user.etablissementId,
          eleveId,
          demandeurId: req.user.id,
          type,
          statut: 'EN_ATTENTE',
        },
      });
      return res.status(201).json({
        message: 'Demande envoyée au Directeur pour validation.',
        demande,
      });
    }

    // Génération directe (SCOLARITE ou ADMIN/DIRECTEUR)
    const demande = await prisma.certificatDemande.create({
      data: {
        etablissementId: req.user.etablissementId,
        eleveId,
        demandeurId: req.user.id,
        type,
        statut: 'APPROUVE',
        valideParId: req.user.id,
        valideLe: new Date(),
      },
    });

    const etablissement = await prisma.etablissement.findUnique({
      where: { id: req.user.etablissementId },
    });
    const pdfBuffer = await genererPdfBuffer(etablissement, eleve, inscription, type);

    try {
      const { enregistrerAudit } = require('../services/audit.service');
      await enregistrerAudit({
        etablissementId: req.user.etablissementId,
        utilisateurId: req.user.id,
        action: 'GENERATE_CERTIFICAT',
        entite: 'Eleve',
        entiteId: eleveId,
        details: { type, matricule: eleve.matricule, demandeId: demande.id },
        ip: req.ip,
      });
    } catch (_) {}

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificat-${type.toLowerCase()}-${eleve.matricule}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/** GET /api/certificats/demandes — liste des demandes en attente */
async function listerDemandes(req, res, next) {
  try {
    const { statut } = req.query;
    const demandes = await prisma.certificatDemande.findMany({
      where: {
        etablissementId: req.user.etablissementId,
        ...(statut ? { statut } : {}),
      },
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
        demandeur: { select: { nom: true, prenom: true, role: true } },
        validePar: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(demandes);
  } catch (err) {
    next(err);
  }
}
async function nombreEnAttente(req, res, next) {
  try {
    const total = await prisma.certificatDemande.count({
      where: {
        etablissementId: req.user.etablissementId,
        statut: 'EN_ATTENTE',
      },
    });
    res.json({ enAttente: total });
  } catch (err) {
    next(err);
  }
}

/** POST /api/certificats/demandes/:id/approuver */
async function approuverDemande(req, res, next) {
  try {
    const demande = await prisma.certificatDemande.findFirst({
      where: {
        id: req.params.id,
        etablissementId: req.user.etablissementId,
        statut: 'EN_ATTENTE',
      },
      include: {
        eleve: {
          include: {
            inscriptions: {
              where: { statut: 'ACTIVE' },
              include: {
                classe: { include: { niveau: true } },
                anneeScolaire: true,
              },
              take: 1,
            },
          },
        },
      },
    });
    if (!demande) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });

    const inscription = demande.eleve.inscriptions[0];
    if (!inscription) {
      return res.status(400).json({ error: 'Aucune inscription active' });
    }

    const erreurRegle = await verifierReglesMetier(demande.eleve, inscription, demande.type);
    if (erreurRegle) {
      return res.status(403).json({ error: erreurRegle });
    }

    await prisma.certificatDemande.update({
      where: { id: demande.id },
      data: {
        statut: 'APPROUVE',
        valideParId: req.user.id,
        valideLe: new Date(),
      },
    });

    const etablissement = await prisma.etablissement.findUnique({
      where: { id: req.user.etablissementId },
    });
    const pdfBuffer = await genererPdfBuffer(
      etablissement,
      demande.eleve,
      inscription,
      demande.type
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificat-${demande.type.toLowerCase()}-${demande.eleve.matricule}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/** POST /api/certificats/demandes/:id/rejeter */
async function rejeterDemande(req, res, next) {
  try {
    const { motifRejet } = req.body;
    const demande = await prisma.certificatDemande.findFirst({
      where: {
        id: req.params.id,
        etablissementId: req.user.etablissementId,
        statut: 'EN_ATTENTE',
      },
    });
    if (!demande) return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });

    await prisma.certificatDemande.update({
      where: { id: demande.id },
      data: {
        statut: 'REJETE',
        motifRejet: motifRejet || 'Rejeté par la direction',
        valideParId: req.user.id,
        valideLe: new Date(),
      },
    });

    res.json({ message: 'Demande rejetée' });
  } catch (err) {
    next(err);
  }
}

async function apercuAppreciation(req, res, next) {
  try {
    const { moyenne, rang, effectif } = req.query;
    const appreciation = genererAppreciation(
      moyenne !== undefined ? Number(moyenne) : null,
      rang !== undefined ? Number(rang) : null,
      effectif !== undefined ? Number(effectif) : null
    );
    res.json({ appreciation });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  genererCertificat,
  listerDemandes,
  approuverDemande,
  rejeterDemande,
  apercuAppreciation,
  nombreEnAttente,
};