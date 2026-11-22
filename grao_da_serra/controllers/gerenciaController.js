const gerenciaModel = require('../models/gerenciaModel');

async function repor(req, res, next) {
  try {
    res.json(await gerenciaModel.listarParaRepor());
  } catch (erro) { next(erro); }
}

async function vendas(req, res, next) {
  try {
    res.json(await gerenciaModel.listarVendasPorCategoria());
  } catch (erro) { next(erro); }
}

async function historico(req, res, next) {
  try {
    res.json(await gerenciaModel.listarHistoricoPrecos());
  } catch (erro) { next(erro); }
}

async function reajustar(req, res, next) {
  try {
    const { idCategoria, percentual } = req.body;
    await gerenciaModel.reajustarPrecos(idCategoria, percentual);
    res.json({ ok: true });
  } catch (erro) { next(erro); }
}

module.exports = { repor, vendas, historico, reajustar };
