const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { obtenirStatistiques } = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authRequired);
router.get('/stats', obtenirStatistiques);

module.exports = router;