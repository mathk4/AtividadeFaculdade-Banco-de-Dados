const pool = require('../connection');

// View vw_produtos_para_repor
async function listarParaRepor() {
  const [linhas] = await pool.query('SELECT * FROM vw_produtos_para_repor ORDER BY faltam DESC');
  return linhas;
}

// View vw_vendas_por_categoria
async function listarVendasPorCategoria() {
  const [linhas] = await pool.query('SELECT * FROM vw_vendas_por_categoria');
  return linhas;
}

// Tabela historico_preco
async function listarHistoricoPrecos() {
  const [linhas] = await pool.query('SELECT * FROM historico_preco ORDER BY id_historico DESC');
  return linhas;
}

// CALL sp_reajustar_precos_categoria
async function reajustarPrecos(idCategoria, percentual) {
  await pool.query('CALL sp_reajustar_precos_categoria(?, ?)', [idCategoria, percentual]);
}

module.exports = { listarParaRepor, listarVendasPorCategoria, listarHistoricoPrecos, reajustarPrecos };
