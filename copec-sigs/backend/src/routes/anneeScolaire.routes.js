const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { lister } = require('../controllers/anneeScolaire.controller');

const router = express.Router();

router.use(authRequired);
router.get('/', lister);

module.exports = router;