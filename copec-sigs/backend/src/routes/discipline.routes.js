const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, creer, supprimer, resumeEleve } = require('../controllers/discipline.controller');

const router = express.Router();

router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR', 'SURVEILLANT', 'ENSEIGNANT', 'SECRETAIRE'));

router.get('/', lister);
router.post('/', requireRole('ADMIN', 'DIRECTEUR', 'SURVEILLANT', 'ENSEIGNANT'), creer);
router.get('/eleve/:eleveId', resumeEleve);
router.delete('/:id', requireRole('ADMIN', 'DIRECTEUR'), supprimer);

module.exports = router;