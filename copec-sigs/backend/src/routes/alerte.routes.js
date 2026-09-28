const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { listerAlertes } = require('../controllers/alerte.controller');

const router = express.Router();

router.use(authRequired);
router.get('/', listerAlertes);

module.exports = router;