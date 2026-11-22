const express = require('express');
const controller = require('../controllers/produtoController');
const router = express.Router();

router.get('/cardapio', controller.cardapio);      
router.get('/categorias', controller.categorias);   

module.exports = router;
