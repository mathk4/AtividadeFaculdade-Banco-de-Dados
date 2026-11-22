/* =====================================================================
   app.js — o que acontece quando o usuário clica nas telas.

   Regra do projeto: este arquivo NÃO calcula nada (total, desconto,
   estoque). Ele só chama as funções do dados.js e mostra o resultado.

   Como ler: o arquivo segue a ordem das telas.
     1. Funções de apoio  2. Navegação  3. Cardápio  4. Novo pedido
     5. Pedidos           6. Gerência   7. Início
   ===================================================================== */


/* =====================================================================
   1. FUNÇÕES DE APOIO
   ===================================================================== */

// Atalho para achar um elemento da página pelo id
function pegar(id) {
  return document.getElementById(id);
}

// Evita que um texto com < ou & quebre o HTML da página
function proteger(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Formatadores: só mudam o JEITO de mostrar, não o valor
function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatarData(data) {
  return new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
function formatarPercentual(valor) {
  return valor + '%';
}

// ----- Faixa de mensagens no topo da tela -----
function mostrarErro(texto) {
  const faixa = pegar('mensagem');
  faixa.textContent = texto;
  faixa.className = 'erro';
  faixa.hidden = false;
}

function mostrarSucesso(texto) {
  const faixa = pegar('mensagem');
  faixa.textContent = texto;
  faixa.className = 'ok';
  faixa.hidden = false;
  setTimeout(function () { faixa.hidden = true; }, 5000);   // some depois de 5 segundos
}

function esconderMensagem() {
  pegar('mensagem').hidden = true;
}

// Monta uma tabela HTML.
//   colunas: lista de { campo, titulo, formato }  (formato é opcional)
//   linhas:  a lista de registros que veio do banco
function montarTabela(colunas, linhas) {
  if (linhas.length === 0) {
    return '<p>Nenhum registro.</p>';
  }

  let html = '<table><thead><tr>';
  for (const coluna of colunas) {
    html += '<th>' + coluna.titulo + '</th>';
  }
  html += '</tr></thead><tbody>';

  for (const linha of linhas) {
    html += '<tr>';
    for (const coluna of colunas) {
      let valor = linha[coluna.campo];
      if (coluna.formato) {
        valor = coluna.formato(valor);
      }
      html += '<td>' + proteger(valor) + '</td>';
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}


/* =====================================================================
   2. NAVEGAÇÃO ENTRE AS TELAS
   ===================================================================== */

// Mostra só a tela escolhida e marca o botão do menu correspondente
function mostrarTela(nome) {
  for (const tela of document.querySelectorAll('.tela')) {
    tela.hidden = (tela.id !== nome);
  }
  for (const botao of document.querySelectorAll('#menu button')) {
    if (botao.dataset.tela === nome) {
      botao.classList.add('ativo');
    } else {
      botao.classList.remove('ativo');
    }
  }
  esconderMensagem();
  carregarTela(nome);
}

// Busca no banco os dados da tela (sempre que entramos nela)
async function carregarTela(nome) {
  try {
    if (nome === 'cardapio') await carregarCardapio();
    if (nome === 'novo')     await carregarNovo();
    if (nome === 'pedidos')  await carregarPedidos();
    if (nome === 'gerencia') await carregarGerencia();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

// Cada botão do menu abre a sua tela
for (const botao of document.querySelectorAll('#menu button')) {
  botao.onclick = function () {
    mostrarTela(botao.dataset.tela);
  };
}


/* =====================================================================
   3. TELA CARDÁPIO
   ===================================================================== */

async function carregarCardapio() {
  const produtos = await listarCardapio();

  // Separa os produtos por categoria. Resultado, por exemplo:
  //   { "Cafés": [produto, produto], "Doces": [produto] }
  const porCategoria = {};
  for (const produto of produtos) {
    if (porCategoria[produto.categoria] === undefined) {
      porCategoria[produto.categoria] = [];
    }
    porCategoria[produto.categoria].push(produto);
  }

  // Monta o HTML: um título por categoria e um cartão por produto
  let html = '';
  for (const categoria in porCategoria) {
    html += '<h2>' + proteger(categoria) + '</h2>';
    html += '<div class="grade">';
    for (const produto of porCategoria[categoria]) {
      html += montarCartao(produto);
    }
    html += '</div>';
  }
  pegar('cardapio').innerHTML = html;
}

// Cartão de um produto. ESGOTADO fica apagado; REPOR ganha um aviso discreto.
function montarCartao(produto) {
  let classe = 'cartao';
  let aviso = '';

  if (produto.situacao === 'ESGOTADO') {
    classe += ' esgotado';
    aviso = '<em class="tag vermelho">Esgotado</em>';
  } else if (produto.situacao === 'REPOR') {
    aviso = '<em class="tag amarelo">Poucas unidades</em>';
  }

  return '<div class="' + classe + '">'
       + '<small class="cod">Cód. ' + produto.id_produto + '</small>'
       + '<strong>' + proteger(produto.produto) + '</strong>'
       + '<span class="preco">' + formatarMoeda(produto.preco) + '</span>'
       + aviso
       + '</div>';
}


/* =====================================================================
   4. TELA NOVO PEDIDO
   ===================================================================== */

// Guarda o pedido que está sendo montado.
//   null  -> nenhum pedido aberto ainda
//   senão -> { id: 11, itens: [ { id_produto, nome, qtd }, ... ] }
let pedidoAtual = null;

// Os campos de busca mostram "Nome (nº 3)". Estes objetos guardam a ligação
// entre esse texto e o id, para sabermos qual pessoa foi escolhida:
//   { "Ana Beatriz Schroeder (nº 1)": 1, ... }
const clientesPorTexto = {};
const funcionariosPorTexto = {};

// Preenche a lista de sugestões de um campo de busca
function preencherBusca(idDaLista, pessoas, campoId, mapa) {
  for (const texto in mapa) {
    delete mapa[texto];                       // limpa o que havia antes
  }
  let html = '';
  for (const pessoa of pessoas) {
    const texto = pessoa.nome + ' (nº ' + pessoa[campoId] + ')';
    mapa[texto] = pessoa[campoId];
    html += '<option value="' + proteger(texto) + '">';
  }
  pegar(idDaLista).innerHTML = html;
}

// Descobre o id da pessoa escolhida; se o texto não está na lista, dá erro
function descobrirId(idDoCampo, mapa, rotulo) {
  const id = mapa[pegar(idDoCampo).value];
  if (id === undefined) {
    throw new Error('Escolha um ' + rotulo + ' da lista de busca.');
  }
  return id;
}

async function carregarNovo() {
  preencherBusca('listaClientes', await listarClientes(), 'id_cliente', clientesPorTexto);
  preencherBusca('listaFuncs', await listarFuncionarios(), 'id_funcionario', funcionariosPorTexto);
  await carregarProdutosSelect();
  desenharPedido();
}

// Lista de produtos para escolher. Os esgotados aparecem desabilitados.
async function carregarProdutosSelect() {
  const produtos = await listarCardapio();
  let html = '';
  for (const produto of produtos) {
    let texto = produto.produto + ' — ' + formatarMoeda(produto.preco);
    let desabilitado = '';
    if (produto.situacao === 'ESGOTADO') {
      texto += ' (esgotado)';
      desabilitado = 'disabled';
    }
    html += '<option value="' + produto.id_produto + '" ' + desabilitado + '>'
          + proteger(texto) + '</option>';
  }
  pegar('selProduto').innerHTML = html;
}

// Mostra (ou esconde) o painel do pedido e a lista de itens
function desenharPedido() {
  if (pedidoAtual === null) {
    pegar('painelPedido').hidden = true;
    return;
  }
  pegar('painelPedido').hidden = false;
  pegar('numPedido').textContent = pedidoAtual.id;

  if (pedidoAtual.itens.length === 0) {
    pegar('listaItens').innerHTML = '<li>Nenhum item adicionado.</li>';
    return;
  }
  let html = '';
  for (const item of pedidoAtual.itens) {
    html += '<li>' + item.qtd + ' × ' + proteger(item.nome)
          + '<button data-remover="' + item.id_produto + '">Remover</button></li>';
  }
  pegar('listaItens').innerHTML = html;
}

// ----- Botão "Abrir pedido" -----
async function aoClicarAbrir() {
  try {
    const idCliente = descobrirId('selCliente', clientesPorTexto, 'cliente');
    const idFuncionario = descobrirId('selFunc', funcionariosPorTexto, 'atendente');

    const idPedido = await abrirPedido(idCliente, idFuncionario);   // chama sp_abrir_pedido

    pedidoAtual = { id: idPedido, itens: [] };
    pegar('resultado').hidden = true;
    desenharPedido();
    mostrarSucesso('Pedido aberto.');
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

// ----- Botão "Adicionar item" -----
async function aoClicarAdicionar() {
  try {
    const idProduto = Number(pegar('selProduto').value);
    const quantidade = Number(pegar('qtd').value);
    const nome = pegar('selProduto').selectedOptions[0].textContent.split(' — ')[0];

    // O produto já está neste pedido?
    let itemExistente = null;
    for (const item of pedidoAtual.itens) {
      if (item.id_produto === idProduto) {
        itemExistente = item;
      }
    }

    if (itemExistente === null) {
      // Produto novo no pedido: é só adicionar
      await adicionarItem(pedidoAtual.id, idProduto, quantidade);
      pedidoAtual.itens.push({ id_produto: idProduto, nome: nome, qtd: quantidade });
    } else {
      // Produto repetido: soma a quantidade na linha que já existe
      await somarNaLinhaExistente(itemExistente, quantidade);
    }

    await carregarProdutosSelect();   // o estoque mudou (trigger), então recarrega
    desenharPedido();
    mostrarSucesso('Item adicionado.');
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

// A tabela item_pedido não aceita o mesmo produto duas vezes no mesmo pedido
// (a chave primária é id_pedido + id_produto). Por isso, para somar:
//   1) remove a linha antiga   (o trigger devolve o estoque)
//   2) insere de novo com a quantidade total  (o trigger baixa o estoque)
async function somarNaLinhaExistente(item, quantidadeExtra) {
  if (!(quantidadeExtra > 0)) {
    throw new Error('Quantidade deve ser maior que zero.');
  }

  await removerItem(pedidoAtual.id, item.id_produto);
  try {
    await adicionarItem(pedidoAtual.id, item.id_produto, item.qtd + quantidadeExtra);
  } catch (erro) {
    // Deu erro (ex.: estoque insuficiente): coloca a linha antiga de volta
    await adicionarItem(pedidoAtual.id, item.id_produto, item.qtd);
    throw erro;
  }
  item.qtd = item.qtd + quantidadeExtra;
}

// ----- Botão "Remover" de cada item -----
// Um único "ouvinte" na lista descobre qual botão Remover foi clicado
async function aoClicarNaLista(evento) {
  const idProduto = evento.target.dataset.remover;
  if (idProduto === undefined) {
    return;                           // clicou em outra coisa, ignora
  }
  try {
    await removerItem(pedidoAtual.id, Number(idProduto));

    // Tira o item da lista que aparece na tela
    const itensRestantes = [];
    for (const item of pedidoAtual.itens) {
      if (item.id_produto !== Number(idProduto)) {
        itensRestantes.push(item);
      }
    }
    pedidoAtual.itens = itensRestantes;

    await carregarProdutosSelect();
    desenharPedido();
    mostrarSucesso('Item removido.');
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

// ----- Botão "Finalizar pedido" -----
async function aoClicarFinalizar() {
  try {
    const resultado = await finalizarPedido(pedidoAtual.id);   // chama sp_finalizar_pedido

    pegar('resultado').innerHTML = 'Pedido nº ' + pedidoAtual.id + ' finalizado.<br>'
      + 'Desconto aplicado: <strong>' + resultado.desconto_percentual + '%</strong>'
      + ' — Total: <strong>' + formatarMoeda(resultado.valor_total) + '</strong>';
    pegar('resultado').hidden = false;

    pedidoAtual = null;               // pedido encerrado
    await carregarProdutosSelect();
    desenharPedido();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

// Liga os botões às funções acima
pegar('btnAbrir').onclick = aoClicarAbrir;
pegar('btnAdicionar').onclick = aoClicarAdicionar;
pegar('listaItens').onclick = aoClicarNaLista;
pegar('btnFinalizar').onclick = aoClicarFinalizar;


/* =====================================================================
   5. TELA PEDIDOS
   ===================================================================== */

const colunasPedidos = [
  { campo: 'id_pedido',           titulo: 'Nº' },
  { campo: 'data_pedido',         titulo: 'Data',        formato: formatarData },
  { campo: 'status',              titulo: 'Status' },
  { campo: 'cliente',             titulo: 'Cliente' },
  { campo: 'atendente',           titulo: 'Atendente' },
  { campo: 'qtd_itens',           titulo: 'Itens' },
  { campo: 'valor_bruto',         titulo: 'Valor bruto', formato: formatarMoeda },
  { campo: 'desconto_percentual', titulo: 'Desconto',    formato: formatarPercentual },
  { campo: 'valor_total',         titulo: 'Total',       formato: formatarMoeda }
];

async function carregarPedidos() {
  let status = pegar('filtroStatus').value;   // "" significa "Todos"
  if (status === '') {
    status = undefined;
  }
  const pedidos = await listarPedidos(status);
  pegar('tabPedidos').innerHTML = montarTabela(colunasPedidos, pedidos);
}

// Ao trocar o filtro, recarrega a lista
pegar('filtroStatus').onchange = function () {
  carregarTela('pedidos');
};


/* =====================================================================
   6. TELA GERÊNCIA
   ===================================================================== */

const colunasRepor = [
  { campo: 'id_produto',     titulo: 'Cód.' },
  { campo: 'produto',        titulo: 'Produto' },
  { campo: 'categoria',      titulo: 'Categoria' },
  { campo: 'estoque',        titulo: 'Estoque' },
  { campo: 'estoque_minimo', titulo: 'Mínimo' },
  { campo: 'faltam',         titulo: 'Faltam' }
];

const colunasVendas = [
  { campo: 'categoria',   titulo: 'Categoria' },
  { campo: 'unidades',    titulo: 'Unidades' },
  { campo: 'faturamento', titulo: 'Faturamento', formato: formatarMoeda }
];

const colunasHistorico = [
  { campo: 'id_historico',   titulo: 'Nº' },
  { campo: 'id_produto',     titulo: 'Produto (cód.)' },
  { campo: 'preco_antigo',   titulo: 'Preço antigo', formato: formatarMoeda },
  { campo: 'preco_novo',     titulo: 'Preço novo',   formato: formatarMoeda },
  { campo: 'data_alteracao', titulo: 'Data',         formato: formatarData },
  { campo: 'usuario',        titulo: 'Usuário' }
];

async function carregarGerencia() {
  pegar('tabRepor').innerHTML = montarTabela(colunasRepor, await listarProdutosParaRepor());
  pegar('tabVendas').innerHTML = montarTabela(colunasVendas, await listarVendasPorCategoria());
  pegar('tabHistorico').innerHTML = montarTabela(colunasHistorico, await listarHistoricoPrecos());

  // A lista de categorias do formulário só precisa ser preenchida uma vez
  if (pegar('selCategoria').options.length === 0) {
    const categorias = await listarCategorias();
    let html = '';
    for (const categoria of categorias) {
      html += '<option value="' + categoria.id_categoria + '">' + proteger(categoria.nome) + '</option>';
    }
    pegar('selCategoria').innerHTML = html;
  }
}

// ----- Botão "Aplicar reajuste" -----
async function aoClicarReajustar() {
  try {
    const idCategoria = Number(pegar('selCategoria').value);

    let percentual = null;                       // campo vazio = inválido
    if (pegar('percentual').value !== '') {
      percentual = Number(pegar('percentual').value);
    }

    await reajustarPrecos(idCategoria, percentual);   // chama sp_reajustar_precos_categoria

    await carregarGerencia();                    // preços e histórico mudaram
    mostrarSucesso('Preços reajustados.');
  } catch (erro) {
    mostrarErro(erro.message);
  }
}
pegar('btnReajustar').onclick = aoClicarReajustar;


/* =====================================================================
   7. INÍCIO — abre o Cardápio quando a página carrega
   ===================================================================== */
mostrarTela('cardapio');
