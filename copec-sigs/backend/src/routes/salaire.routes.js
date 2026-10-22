const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  getParametres,
  updateParametres,
  calculerSalaire,
  calculerTous,
  saisirPresence,  // <-- Ajouter ici
  listerPresences, // <-- Ajouter ici
} = require('../controllers/salaire.controller');

const router = express.Router();
router.use(authRequired);

router.get('/parametres', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), getParametres);
router.put('/parametres', requireRole('ADMIN', 'DIRECTEUR'), updateParametres);
router.get('/calcul', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), calculerSalaire);
router.get('/calcul-tous', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), calculerTous);
router.post('/presences', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), saisirPresence);
router.get('/presences', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), listerPresences);

module.exports = router;