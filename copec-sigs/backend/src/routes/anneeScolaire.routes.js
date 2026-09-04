const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, creer, activer } = require('../controllers/anneeScolaire.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', lister);
router.post('/', requireRole('ADMIN', 'DIRECTEUR'), creer);
router.patch('/:id/activer', requireRole('ADMIN', 'DIRECTEUR'), activer);

module.exports = router;