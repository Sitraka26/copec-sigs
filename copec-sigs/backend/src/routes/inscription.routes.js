const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, creer, modifierStatut, changerClasse } = require('../controllers/inscription.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', lister);
router.post('/', requireRole('ADMIN', 'SECRETAIRE'), creer);
router.patch('/:id/statut', requireRole('ADMIN', 'SECRETAIRE', 'DIRECTEUR'), modifierStatut);
router.patch('/:id/classe', requireRole('ADMIN', 'SECRETAIRE'), changerClasse);

module.exports = router;