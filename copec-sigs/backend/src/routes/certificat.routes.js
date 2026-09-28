const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  genererCertificat,
  listerDemandes,
  approuverDemande,
  rejeterDemande,
  apercuAppreciation,
  nombreEnAttente,
} = require('../controllers/certificat.controller');

const router = express.Router();

router.use(authRequired);

router.get('/appreciation', apercuAppreciation);
router.post('/generer', requireRole('ADMIN', 'DIRECTEUR', 'ENSEIGNANT'), genererCertificat);

// Compteur pour le badge (avant les routes avec :id)
router.get(
  '/demandes/en-attente/nombre',
  requireRole('ADMIN', 'DIRECTEUR'),
  nombreEnAttente
);

router.get('/demandes', requireRole('ADMIN', 'DIRECTEUR', 'ENSEIGNANT'), listerDemandes);
router.post('/demandes/:id/approuver', requireRole('ADMIN', 'DIRECTEUR'), approuverDemande);
router.post('/demandes/:id/rejeter', requireRole('ADMIN', 'DIRECTEUR'), rejeterDemande);

module.exports = router;