const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  listerRecus,
  listerEnvoyes,
  envoyer,
  marquerLu,
  nombreNonLus,
} = require('../controllers/message.controller');

const router = express.Router();

router.use(authRequired);

const TOUS = [
  'ADMIN',
  'DIRECTEUR',
  'SECRETAIRE',
  'ECONOME',
  'ENSEIGNANT',
  'SURVEILLANT',
];

router.get('/', listerRecus);
router.get('/envoyes', listerEnvoyes);
router.get('/non-lus/nombre', nombreNonLus);
router.patch('/:id/lu', marquerLu);
router.post('/', requireRole(...TOUS), envoyer);

module.exports = router;