const express = require('express');
const controller = require('../controllers/gerenciaController');
const router = express.Router();

router.get('/repor', controller.repor);
router.get('/vendas', controller.vendas);
router.get('/historico', controller.historico);
router.post('/reajuste', controller.reajustar);

module.exports = router;
