const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, creer, assignerMatieres } = require('../controllers/enseignant.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', lister);
router.post('/', requireRole('ADMIN', 'DIRECTEUR'), creer);
router.patch('/:id/matieres', requireRole('ADMIN', 'DIRECTEUR'), assignerMatieres);

module.exports = router;