const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { apercuClasse, genererPourClasse, detailBulletinEleve, genererPdfEleve } = require('../controllers/bulletin.controller');

const router = express.Router();

router.use(authRequired);

router.get('/classe/:classeId/periode/:periode', apercuClasse);
router.post('/generer', requireRole('ADMIN', 'DIRECTEUR'), genererPourClasse);
router.get('/eleve/:eleveId/periode/:periode', detailBulletinEleve);
router.get('/eleve/:eleveId/annee/:anneeScolaireId/pdf', genererPdfEleve);

module.exports = router;