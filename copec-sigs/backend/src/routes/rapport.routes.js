const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  exporterEleves,
  exporterPaiements,
  obtenirSynthese,
  exporterAbsences,
  exporterResultats,
} = require('../controllers/rapport.controller');

const router = express.Router();
router.use(authRequired);

router.get('/eleves', requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'), exporterEleves);
router.get('/paiements', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), exporterPaiements);
router.get('/synthese', requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ECONOME'), obtenirSynthese);
router.get('/absences', requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'), exporterAbsences);
router.get('/resultats', requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'), exporterResultats);

module.exports = router;