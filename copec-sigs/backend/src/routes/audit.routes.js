const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister } = require('../controllers/audit.controller');

const router = express.Router();

router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR'));

router.get('/', lister);

module.exports = router;