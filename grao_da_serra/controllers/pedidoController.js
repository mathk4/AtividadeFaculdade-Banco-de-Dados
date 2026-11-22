const pedidoModel = require('../models/pedidoModel');

async function listar(req, res, next) {
  try {
    res.json(await pedidoModel.listarPedidos(req.query.status));
  } catch (erro) { next(erro); }
}

async function abrir(req, res, next) {
  try {
    const { idCliente, idFuncionario } = req.body;
    res.json(await pedidoModel.abrirPedido(idCliente, idFuncionario));
  } catch (erro) { next(erro); }
}

async function adicionarItem(req, res, next) {
  try {
    const { idProduto, quantidade } = req.body;
    await pedidoModel.adicionarItem(req.params.id, idProduto, quantidade);
    res.json({ ok: true });
  } catch (erro) { next(erro); }
}

async function removerItem(req, res, next) {
  try {
    await pedidoModel.removerItem(req.params.id, req.params.idProduto);
    res.json({ ok: true });
  } catch (erro) { next(erro); }
}

async function finalizar(req, res, next) {
  try {
    res.json(await pedidoModel.finalizarPedido(req.params.id));
  } catch (erro) { next(erro); }
}

module.exports = { listar, abrir, adicionarItem, removerItem, finalizar };
