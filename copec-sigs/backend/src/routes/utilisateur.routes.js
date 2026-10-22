const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  lister,
  creer,
  reinitialiserMotDePasse,
  changerActif,
} = require('../controllers/utilisateur.controller');

const router = express.Router();

router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR'));

router.get('/', lister);
router.post('/', creer);
router.post('/:id/reset-password', reinitialiserMotDePasse);
router.patch('/:id/actif', changerActif);

module.exports = router;