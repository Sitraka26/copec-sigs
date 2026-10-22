const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const {
  lister,
  creer,
  assignerMatieres,
  mettreAJour,
  supprimer,
  reinitialiserMotDePasse,
  listerIndisponibilites,
  creerIndisponibilite,
  supprimerIndisponibilite,
} = require('../controllers/enseignant.controller');

const router = express.Router();
router.use(authRequired);
router.use(requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'));

router.get('/', lister);
router.post('/', requireRole('ADMIN', 'DIRECTEUR'), creer);

// Indisponibilités (avant /:id générique si besoin)
router.get('/:id/indisponibilites', listerIndisponibilites);
router.post(
  '/:id/indisponibilites',
  requireRole('ADMIN', 'DIRECTEUR'),
  creerIndisponibilite
);
router.delete(
  '/:id/indisponibilites/:indispoId',
  requireRole('ADMIN', 'DIRECTEUR'),
  supprimerIndisponibilite
);

router.put('/:id', requireRole('ADMIN', 'DIRECTEUR'), mettreAJour);
router.delete('/:id', requireRole('ADMIN', 'DIRECTEUR'), supprimer);
router.patch('/:id/matieres', requireRole('ADMIN', 'DIRECTEUR'), assignerMatieres);
router.post(
  '/:id/reset-password',
  requireRole('ADMIN', 'DIRECTEUR'),
  reinitialiserMotDePasse
);

module.exports = router;