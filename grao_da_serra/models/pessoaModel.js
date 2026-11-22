const pool = require('../connection');

async function listarClientes() {
  const [linhas] = await pool.query('SELECT id_cliente, nome FROM cliente ORDER BY nome');
  return linhas;
}

async function listarFuncionarios() {
  const [linhas] = await pool.query('SELECT id_funcionario, nome FROM funcionario ORDER BY nome');
  return linhas;
}

module.exports = { listarClientes, listarFuncionarios };
