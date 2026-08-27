const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { creer, lister, obtenirSolde, genererRecuPdf } = require('../controllers/paiement.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', lister);
router.post('/', requireRole('ADMIN', 'ECONOME'), creer);
router.get('/eleve/:eleveId/solde', obtenirSolde);
router.get('/:id/recu', genererRecuPdf);

module.exports = router;