const produtoModel = require('../models/produtoModel');

async function cardapio(req, res, next) {
  try {
    res.json(await produtoModel.listarCardapio());
  } catch (erro) { next(erro); }
}

async function categorias(req, res, next) {
  try {
    res.json(await produtoModel.listarCategorias());
  } catch (erro) { next(erro); }
}

module.exports = { cardapio, categorias };
