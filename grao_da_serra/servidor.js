/* =====================================================================
   servidor.js — programa intermediário entre a interface e o MySQL.

   Por que ele existe? O navegador não consegue falar direto com o MySQL.
   Então: página (navegador)  →  este servidor  →  banco grao_da_serra

   Cada rota abaixo faz UMA coisa: recebe o pedido da página, executa um
   SELECT (view) ou um CALL (procedure) e devolve o resultado em JSON.
   ===================================================================== */

require('dotenv').config();             // lê o arquivo .env (usuário e senha do banco)
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());                                       // entende o JSON que a página envia
app.use(express.static(path.join(__dirname, 'publico')));      // entrega a interface (index.html etc.)

// ---------- Conexão com o banco ----------
// "pool" = grupo de conexões reaproveitadas. Os dados vêm do arquivo .env.
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  decimalNumbers: true      // devolve DECIMAL como número (e não como texto)
});

// ---------- Auxiliar: trata erros de forma padrão ----------
// Se o banco recusar algo (SIGNAL das procedures e triggers), a mensagem em
// português fica em erro.sqlMessage. Enviamos ela de volta para a página mostrar.
function rota(funcao) {
  return async function (req, res) {
    try {
      res.json(await funcao(req));
    } catch (erro) {
      console.log('Erro:', erro.sqlMessage || erro.message);
      const status = erro.sqlState ? 400 : 500;        // 400 = erro do banco; 500 = erro do servidor
      res.status(status).json({ erro: erro.sqlMessage || erro.message });
    }
  };
}

// Executa um SELECT e devolve as linhas
async function consultar(sql, parametros) {
  const [linhas] = await pool.query(sql, parametros);
  return linhas;
}

// =====================================================================
// ROTAS DE CONSULTA (SELECT)
// =====================================================================
app.get('/api/cardapio', rota(function () {
  return consultar('SELECT * FROM vw_cardapio ORDER BY categoria, produto');
}));

app.get('/api/clientes', rota(function () {
  return consultar('SELECT id_cliente, nome FROM cliente ORDER BY nome');
}));

app.get('/api/funcionarios', rota(function () {
  return consultar('SELECT id_funcionario, nome FROM funcionario ORDER BY nome');
}));

app.get('/api/categorias', rota(function () {
  return consultar('SELECT id_categoria, nome FROM categoria ORDER BY nome');
}));

// Lista de pedidos; o filtro de status é opcional (?status=ABERTO)
app.get('/api/pedidos', rota(function (req) {
  if (req.query.status) {
    return consultar('SELECT * FROM vw_pedidos_detalhados WHERE status = ? ORDER BY id_pedido DESC',
                     [req.query.status]);
  }
  return consultar('SELECT * FROM vw_pedidos_detalhados ORDER BY id_pedido DESC');
}));

app.get('/api/repor', rota(function () {
  return consultar('SELECT * FROM vw_produtos_para_repor ORDER BY faltam DESC');
}));

app.get('/api/vendas', rota(function () {
  return consultar('SELECT * FROM vw_vendas_por_categoria');
}));

app.get('/api/historico', rota(function () {
  return consultar('SELECT * FROM historico_preco ORDER BY id_historico DESC');
}));

// =====================================================================
// ROTAS DE OPERAÇÃO (CALL nas procedures)
// =====================================================================

// Abre um pedido: sp_abrir_pedido tem um parâmetro OUT (p_id_pedido).
// O OUT vira uma variável da SESSÃO (@id), e a sessão é uma conexão só.
// Por isso o CALL e o SELECT @id precisam usar a MESMA conexão.
app.post('/api/pedidos', rota(async function (req) {
  const conexao = await pool.getConnection();
  try {
    await conexao.query('CALL sp_abrir_pedido(?, ?, @id)',
                        [req.body.idCliente, req.body.idFuncionario]);
    const [linhas] = await conexao.query('SELECT @id AS id_pedido');
    return { id_pedido: linhas[0].id_pedido };
  } finally {
    conexao.release();                       // devolve a conexão ao pool, dê certo ou erro
  }
}));

// Adiciona um item (o trigger trg_item_baixa_estoque baixa o estoque sozinho)
app.post('/api/pedidos/:id/itens', rota(async function (req) {
  await pool.query('CALL sp_adicionar_item(?, ?, ?)',
                   [req.params.id, req.body.idProduto, req.body.quantidade]);
  return { ok: true };
}));

// Remove um item: DELETE direto, como pede o enunciado
// (o trigger trg_item_devolve_estoque devolve o estoque sozinho)
app.delete('/api/pedidos/:id/itens/:idProduto', rota(async function (req) {
  await pool.query('DELETE FROM item_pedido WHERE id_pedido = ? AND id_produto = ?',
                   [req.params.id, req.params.idProduto]);
  return { ok: true };
}));

// Finaliza o pedido. A procedure não devolve nada, então depois do CALL
// fazemos um SELECT para pegar o desconto e o total que ela gravou.
app.post('/api/pedidos/:id/finalizar', rota(async function (req) {
  await pool.query('CALL sp_finalizar_pedido(?)', [req.params.id]);
  const linhas = await consultar('SELECT desconto_percentual, valor_total FROM pedido WHERE id_pedido = ?',
                                 [req.params.id]);
  return linhas[0];
}));

// Reajusta os preços de uma categoria (o trigger grava o histórico sozinho)
app.post('/api/reajuste', rota(async function (req) {
  await pool.query('CALL sp_reajustar_precos_categoria(?, ?)',
                   [req.body.idCategoria, req.body.percentual]);
  return { ok: true };
}));

// ---------- Liga o servidor ----------
const porta = process.env.PORT || 3000;
app.listen(porta, function () {
  console.log('Servidor no ar: http://localhost:' + porta);
});
