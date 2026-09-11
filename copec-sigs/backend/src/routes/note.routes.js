const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { listerPourSaisie, enregistrerLot, listerParEleve } = require('../controllers/note.controller');

const router = express.Router();
router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR', 'ENSEIGNANT'));

router.get('/saisie', listerPourSaisie);
router.post('/saisie', enregistrerLot);
router.get('/eleve/:eleveId', listerParEleve);

module.exports = router;