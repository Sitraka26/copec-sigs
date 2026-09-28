const prisma = require('../config/prisma');

async function enregistrerAudit({
  etablissementId,
  utilisateurId = null,
  action,
  entite = null,
  entiteId = null,
  details = null,
  ip = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        etablissementId,
        utilisateurId,
        action,
        entite,
        entiteId,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        ip,
      },
    });
  } catch (err) {
    console.error('[Audit] Erreur enregistrement :', err.message);
  }
}

module.exports = { enregistrerAudit };