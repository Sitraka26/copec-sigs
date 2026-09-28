const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const { lister, obtenirParId, creer, modifier, supprimer } = require('../controllers/eleve.controller');
const { uploadEleves } = require('../middlewares/upload');

const router = express.Router();

// Protège toutes les routes du fichier avec l'authentification
router.use(authRequired);

// Consultation
router.get('/', lister);
router.get('/:id', obtenirParId);

// Création d'un élève (avec fichiers uploadés)
router.post(
  '/',
  requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'),
  uploadEleves.fields([
    { name: 'photoIdentite', maxCount: 1 },
    { name: 'extraitNaissance', maxCount: 1 },
    { name: 'carteBapteme', maxCount: 1 },
  ]),
  creer
);

// Modification d'un élève (avec fichiers optionnels)
router.put(
  '/:id',
  requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'),
  uploadEleves.fields([
    { name: 'photoIdentite', maxCount: 1 },
    { name: 'extraitNaissance', maxCount: 1 },
    { name: 'carteBapteme', maxCount: 1 },
  ]),
  modifier
);

// Suppression d'un élève
router.delete(
  '/:id',
  requireRole('ADMIN', 'DIRECTEUR', 'SECRETAIRE'),
  supprimer
);

module.exports = router;