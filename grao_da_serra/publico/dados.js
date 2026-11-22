// Faz o pedido ao servidor e devolve o JSON da resposta.
// Se algo der errado, lança um Error — o app.js mostra a mensagem na faixa vermelha.
async function chamarApi(metodo, url, corpo) {
  let resposta;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
  } catch (erro) {
    throw new Error('Não foi possível falar com o servidor. Ele está ligado?');
  }

  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.erro);
  }
  return dados;
}

// ---------- Consultas SELECT ----------

// SELECT * FROM vw_cardapio
async function listarCardapio() {
  return chamarApi('GET', '/api/cardapio');
}

// SELECT id_cliente, nome FROM cliente
async function listarClientes() {
  return chamarApi('GET', '/api/clientes');
}

// SELECT id_funcionario, nome FROM funcionario
async function listarFuncionarios() {
  return chamarApi('GET', '/api/funcionarios');
}

// SELECT id_categoria, nome FROM categoria
async function listarCategorias() {
  return chamarApi('GET', '/api/categorias');
}

// SELECT * FROM vw_pedidos_detalhados [WHERE status = ?]
async function listarPedidos(status) {
  let url = '/api/pedidos';
  if (status) {
    url += '?status=' + encodeURIComponent(status);
  }
  return chamarApi('GET', url);
}

// SELECT * FROM vw_produtos_para_repor
async function listarProdutosParaRepor() {
  return chamarApi('GET', '/api/gerencia/repor');
}

// SELECT * FROM vw_vendas_por_categoria
async function listarVendasPorCategoria() {
  return chamarApi('GET', '/api/gerencia/vendas');
}

// SELECT * FROM historico_preco
async function listarHistoricoPrecos() {
  return chamarApi('GET', '/api/gerencia/historico');
}

// ---------- Operações CALL ----------

// CALL sp_abrir_pedido(cliente, funcionario, @id) — devolve o número do pedido
async function abrirPedido(idCliente, idFuncionario) {
  const resposta = await chamarApi('POST', '/api/pedidos',
                                   { idCliente: idCliente, idFuncionario: idFuncionario });
  return resposta.id_pedido;
}

// CALL sp_adicionar_item(pedido, produto, quantidade)
async function adicionarItem(idPedido, idProduto, quantidade) {
  await chamarApi('POST', '/api/pedidos/' + idPedido + '/itens',
                  { idProduto: idProduto, quantidade: quantidade });
}

// DELETE FROM item_pedido WHERE id_pedido = ? AND id_produto = ?
async function removerItem(idPedido, idProduto) {
  await chamarApi('DELETE', '/api/pedidos/' + idPedido + '/itens/' + idProduto);
}

// CALL sp_finalizar_pedido(pedido) — devolve { desconto_percentual, valor_total }
async function finalizarPedido(idPedido) {
  return chamarApi('POST', '/api/pedidos/' + idPedido + '/finalizar');
}

// CALL sp_reajustar_precos_categoria(categoria, percentual)
async function reajustarPrecos(idCategoria, percentual) {
  await chamarApi('POST', '/api/gerencia/reajuste',
                  { idCategoria: idCategoria, percentual: percentual });
}
