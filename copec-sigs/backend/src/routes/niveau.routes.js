const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  lister,
  creer,
  modifier,
  supprimer,
  reordonner,
} = require('../controllers/niveau.controller');

const router = express.Router();

router.use(authRequired);

// Liste : tout le personnel connecté
router.get('/', lister);

// Réordonner AVANT /:id
router.post(
  '/reordonner',
  requireRole('ADMIN', 'DIRECTEUR'),
  reordonner
);

router.post('/', requireRole('ADMIN', 'DIRECTEUR'), creer);
router.put('/:id', requireRole('ADMIN', 'DIRECTEUR'), modifier);
router.delete('/:id', requireRole('ADMIN', 'DIRECTEUR'), supprimer);

module.exports = router;