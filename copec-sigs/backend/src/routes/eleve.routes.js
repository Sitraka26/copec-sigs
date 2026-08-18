const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, obtenirParId, creer, modifier } = require('../controllers/eleve.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', lister);
router.get('/:id', obtenirParId);
router.post('/', requireRole('ADMIN', 'SECRETAIRE'), creer);
router.put('/:id', requireRole('ADMIN', 'SECRETAIRE'), modifier);

module.exports = router;
