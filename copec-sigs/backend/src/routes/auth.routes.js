const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { login, changerMotDePasse } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', login);
router.post('/changer-mot-de-passe', authRequired, changerMotDePasse);

module.exports = router;