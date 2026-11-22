const pool = require('../connection');

// View vw_pedidos_detalhados (com filtro opcional de status)
async function listarPedidos(status) {
  if (status) {
    const [linhas] = await pool.query(
      'SELECT * FROM vw_pedidos_detalhados WHERE status = ? ORDER BY id_pedido DESC', [status]);
    return linhas;
  }
  const [linhas] = await pool.query('SELECT * FROM vw_pedidos_detalhados ORDER BY id_pedido DESC');
  return linhas;
}

// CALL sp_abrir_pedido.
async function abrirPedido(idCliente, idFuncionario) {
  const conexao = await pool.getConnection();
  try {
    await conexao.query('CALL sp_abrir_pedido(?, ?, @id)', [idCliente, idFuncionario]);
    const [linhas] = await conexao.query('SELECT @id AS id_pedido');
    return linhas[0];
  } finally {
    conexao.release();         
  }
}

// CALL sp_adicionar_item 
async function adicionarItem(idPedido, idProduto, quantidade) {
  await pool.query('CALL sp_adicionar_item(?, ?, ?)', [idPedido, idProduto, quantidade]);
}

// DELETE direto
async function removerItem(idPedido, idProduto) {
  await pool.query('DELETE FROM item_pedido WHERE id_pedido = ? AND id_produto = ?',
                   [idPedido, idProduto]);
}

// CALL sp_finalizar_pedido.
async function finalizarPedido(idPedido) {
  await pool.query('CALL sp_finalizar_pedido(?)', [idPedido]);
  const [linhas] = await pool.query(
    'SELECT desconto_percentual, valor_total FROM pedido WHERE id_pedido = ?', [idPedido]);
  return linhas[0];
}

module.exports = { listarPedidos, abrirPedido, adicionarItem, removerItem, finalizarPedido };
