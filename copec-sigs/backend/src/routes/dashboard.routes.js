const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { obtenirStatistiques, obtenirIndicateurs } = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authRequired);
router.get('/stats', obtenirStatistiques);
router.get('/insights', obtenirIndicateurs);

module.exports = router;