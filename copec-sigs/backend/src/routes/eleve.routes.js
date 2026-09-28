const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, obtenirParId, creer, modifier } = require('../controllers/eleve.controller');

const router = express.Router();
router.use(authRequired);

router.get('/', lister);
router.get('/:id', obtenirParId);
router.post('/', requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'), creer);
router.put('/:id', requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'), modifier);
// Suppression d'un élève (réservé aux rôles administratifs)
router.delete('/:id', requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'), async (req, res, next) => {
  try {
    // délègue au controller si nécessaire — utilisation directe simple ici
    const { supprimer } = require('../controllers/eleve.controller');
    await supprimer(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;