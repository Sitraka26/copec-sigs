const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, creer } = require('../controllers/matiere.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', lister);
router.post('/', requireRole('ADMIN', 'DIRECTEUR'), creer);

module.exports = router;