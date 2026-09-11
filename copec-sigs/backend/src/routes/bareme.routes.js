const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, mettreAJour } = require('../controllers/bareme.controller');

const router = express.Router();
router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR', 'ECONOME', 'SECRETAIRE'));

router.get('/', lister);
router.put('/', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), mettreAJour);

module.exports = router;