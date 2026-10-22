const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  listerMatieresParNiveau,
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


router.get('/matieres-niveau/:niveauId', listerMatieresParNiveau);

router.get('/saisie', listerPourSaisie);
router.post('/saisie', enregistrerLot);
router.get('/eleve/:eleveId', listerParEleve);
router.get('/reclamations', listerReclamations);
router.post('/reclamations', creerReclamation);
router.patch('/reclamations/:id', traiterReclamation);

module.exports = router;