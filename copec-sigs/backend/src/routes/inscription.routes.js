const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, creer, modifierStatut, changerClasse } = require('../controllers/inscription.controller');

const router = express.Router();
router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'));

router.get('/', lister);
router.post('/', creer);
router.patch('/:id/statut', modifierStatut);
router.patch('/:id/classe', changerClasse);

module.exports = router;