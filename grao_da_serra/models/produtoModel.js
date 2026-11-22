const pool = require('../connection');

// View vw_cardapio
async function listarCardapio() {
  const [linhas] = await pool.query('SELECT * FROM vw_cardapio ORDER BY categoria, produto');
  return linhas;
}

async function listarCategorias() {
  const [linhas] = await pool.query('SELECT id_categoria, nome FROM categoria ORDER BY nome');
  return linhas;
}

module.exports = { listarCardapio, listarCategorias };
