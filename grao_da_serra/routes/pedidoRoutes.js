const express = require('express');
const controller = require('../controllers/pedidoController');
const router = express.Router();

router.get('/', controller.listar);
router.post('/', controller.abrir);
router.post('/:id/itens', controller.adicionarItem);
router.delete('/:id/itens/:idProduto', controller.removerItem);
router.post('/:id/finalizar', controller.finalizar);

module.exports = router;
