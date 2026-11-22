const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'publico')));

app.use('/api', require('./routes/produtoRoutes'));
app.use('/api', require('./routes/pessoaRoutes'));
app.use('/api/pedidos', require('./routes/pedidoRoutes'));
app.use('/api/gerencia', require('./routes/gerenciaRoutes'));

// Tratamento de erros: todo erro dos controllers (next(erro)) cai aqui.
app.use(function (erro, req, res, next) {
  const mensagem = erro.sqlMessage || erro.message;
  console.log('Erro:', mensagem);
  res.status(erro.sqlState ? 400 : 500).json({ erro: mensagem });
});

module.exports = app;
