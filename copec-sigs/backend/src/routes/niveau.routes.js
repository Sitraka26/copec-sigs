const express = require('express');
const { authRequired, requireRole } = require('../middlewares/auth');
const prisma = require('../config/prisma');
const { obtenirProgramme, mettreAJourProgramme } = require('../controllers/programme.controller');

const router = express.Router();

router.use(authRequired);

router.get('/', async (req, res, next) => {
  try {
    const niveaux = await prisma.niveau.findMany({ orderBy: { ordre: 'asc' } });
    res.json(niveaux);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/programme', obtenirProgramme);
router.put('/:id/programme', requireRole('ADMIN', 'DIRECTEUR'), mettreAJourProgramme);

module.exports = router;