const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { exporterEleves, exporterPaiements } = require('../controllers/rapport.controller');

const router = express.Router();
router.use(authRequired);

router.get('/eleves', requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'), exporterEleves);
router.get('/paiements', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), exporterPaiements);

module.exports = router;