const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { listerParClasse, creer, supprimer } = require('../controllers/emploiDuTemps.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', listerParClasse);
router.post('/', requireRole('ADMIN', 'DIRECTEUR'), creer);
router.delete('/:id', requireRole('ADMIN', 'DIRECTEUR'), supprimer);

module.exports = router;