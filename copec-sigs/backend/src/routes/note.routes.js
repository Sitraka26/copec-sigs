const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  listerPourSaisie,
  enregistrerLot,
  listerParEleve,
  listerReclamations,
  creerReclamation,
  traiterReclamation,
} = require('../controllers/note.controller');

const router = express.Router();
router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR', 'ENSEIGNANT'));

router.get('/saisie', listerPourSaisie);
router.post('/saisie', enregistrerLot);
router.get('/eleve/:eleveId', listerParEleve);
router.get('/reclamations', listerReclamations);
router.post('/reclamations', creerReclamation);
router.patch('/reclamations/:id', traiterReclamation);

module.exports = router;