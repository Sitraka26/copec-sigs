const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, compterNonLus, marquerLu, envoyer, listerEnvoyes } = require('../controllers/message.controller');

const router = express.Router();
router.use(authRequired);

router.get('/', lister);
router.get('/non-lus/nombre', compterNonLus);
router.get('/envoyes', requireRole('ADMIN', 'DIRECTEUR'), listerEnvoyes);
router.post('/', requireRole('ADMIN', 'DIRECTEUR'), envoyer);
router.patch('/:id/lu', marquerLu);

module.exports = router;