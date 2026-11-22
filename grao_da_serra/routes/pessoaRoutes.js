const express = require('express');
const controller = require('../controllers/pessoaController');
const router = express.Router();

router.get('/clientes', controller.clientes);        
router.get('/funcionarios', controller.funcionarios);   

module.exports = router;
