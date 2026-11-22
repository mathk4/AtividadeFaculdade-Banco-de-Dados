const pessoaModel = require('../models/pessoaModel');

async function clientes(req, res, next) {
  try {
    res.json(await pessoaModel.listarClientes());
  } catch (erro) { next(erro); }
}

async function funcionarios(req, res, next) {
  try {
    res.json(await pessoaModel.listarFuncionarios());
  } catch (erro) { next(erro); }
}

module.exports = { clientes, funcionarios };
