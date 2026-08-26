const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { listerPourSaisie, enregistrerLot, listerParEleve } = require('../controllers/note.controller');

const router = express.Router();

router.use(authRequired);

router.get('/saisie', requireRole('ADMIN', 'DIRECTEUR', 'ENSEIGNANT'), listerPourSaisie);
router.post('/saisie', requireRole('ADMIN', 'ENSEIGNANT'), enregistrerLot);
router.get('/eleve/:eleveId', listerParEleve);

module.exports = router;