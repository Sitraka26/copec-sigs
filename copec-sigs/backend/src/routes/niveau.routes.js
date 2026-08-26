const express = require('express');
const { authRequired } = require('../middlewares/auth');
const prisma = require('../config/prisma');

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

module.exports = router;