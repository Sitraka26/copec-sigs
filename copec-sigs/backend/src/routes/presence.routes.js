const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { listerPourSaisie, enregistrerLot, lister } = require('../controllers/presence.controller');

const router = express.Router();
router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR', 'ENSEIGNANT', 'SURVEILLANT', 'SECRETAIRE'));

router.get('/saisie', listerPourSaisie);
router.post('/saisie', requireRole('ADMIN', 'DIRECTEUR', 'ENSEIGNANT', 'SURVEILLANT'), enregistrerLot);
router.get('/', lister);

module.exports = router;