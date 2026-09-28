const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, creer, modifier, supprimer, reordonner } = require('../controllers/niveau.controller');
const {
  obtenirProgramme,
  mettreAJourProgramme,
  listerPlanifications,
  creerPlanification,
  modifierPlanification,
  supprimerPlanification,
  listerEvenements,
  creerEvenement,
  supprimerEvenement,
} = require('../controllers/programme.controller');

const router = express.Router();
router.use(authRequired);

router.get('/', lister);
router.post('/', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), creer);
router.put('/:id', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), modifier);
router.delete('/:id', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), supprimer);
router.post('/reordonner', requireRole('ADMIN', 'DIRECTEUR', 'ECONOME'), reordonner);

router.get('/:id/programme', obtenirProgramme);
router.put('/:id/programme', requireRole('ADMIN', 'DIRECTEUR'), mettreAJourProgramme);
router.get('/planifications', listerPlanifications);
router.post('/planifications', requireRole('ADMIN', 'DIRECTEUR'), creerPlanification);
router.patch('/planifications/:id', requireRole('ADMIN', 'DIRECTEUR'), modifierPlanification);
router.delete('/planifications/:id', requireRole('ADMIN', 'DIRECTEUR'), supprimerPlanification);
router.get('/evenements', listerEvenements);
router.post('/evenements', requireRole('ADMIN', 'DIRECTEUR'), creerEvenement);
router.delete('/evenements/:id', requireRole('ADMIN', 'DIRECTEUR'), supprimerEvenement);

module.exports = router;