use grao_da_serra;

-- ---------------------------------
-- FUNCTIONS
-- ---------------------------------

-- QUESTÃO 1
DROP FUNCTION IF EXISTS fn_total_pedido;

DELIMITER //

CREATE FUNCTION fn_total_pedido(p_id_pedido INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN 
    DECLARE v_total DECIMAL(10,2);

    SELECT COALESCE(SUM(quantidade * preco_unitario), 0) INTO v_total
    FROM item_pedido
    WHERE id_pedido = p_id_pedido;

    RETURN v_total;
END //

DELIMITER ;

SELECT fn_total_pedido(1), fn_total_pedido(3), fn_total_pedido(99);

-- QUESTÃO 2

DROP FUNCTION IF EXISTS fn_situacao_estoque;

DELIMITER //

CREATE FUNCTION fn_situacao_estoque(p_id_produto INT)
RETURNS VARCHAR(10)
READS SQL DATA
BEGIN
    DECLARE v_estoque INT;
    DECLARE v_minimo  INT;

    SELECT estoque, estoque_minimo INTO v_estoque, v_minimo
    FROM produto
    WHERE id_produto = p_id_produto;

    IF v_estoque = 0 THEN
        RETURN 'ESGOTADO';
    ELSEIF v_estoque <= v_minimo THEN
        RETURN 'REPOR';
    ELSE
        RETURN 'OK';
    END IF;
END //

DELIMITER ;

SELECT nome, estoque, estoque_minimo, fn_situacao_estoque(id_produto) FROM produto;


-- QUESTÃO 3

DROP FUNCTION IF EXISTS fn_desconto_fidelidade;

DELIMITER //

CREATE FUNCTION fn_desconto_fidelidade(p_id_cliente INT)
RETURNS DECIMAL(4,2)
READS SQL DATA
BEGIN
    DECLARE v_pedidos_pagos INT;

    SELECT COUNT(*) INTO v_pedidos_pagos
      FROM pedido
     WHERE id_cliente = p_id_cliente
       AND status = 'PAGO';

    IF v_pedidos_pagos >= 4 THEN
        RETURN 10;
    ELSEIF v_pedidos_pagos >= 2 THEN
        RETURN 5;
    ELSE
        RETURN 0;
    END IF;
END //

DELIMITER ;

SELECT nome, fn_desconto_fidelidade(id_cliente) AS desconto FROM cliente;


-- ---------------------------------
-- PROCEDURES
-- ---------------------------------

-- QUESTÃO 4

DROP PROCEDURE IF EXISTS sp_abrir_pedido;

DELIMITER //

CREATE PROCEDURE sp_abrir_pedido(
    IN  p_id_cliente     INT,
    IN  p_id_funcionario INT,
    OUT p_id_pedido      INT
)
BEGIN
    INSERT INTO pedido (id_cliente, id_funcionario)
    VALUES (p_id_cliente, p_id_funcionario);

    SET p_id_pedido = LAST_INSERT_ID();
END //

DELIMITER ;

CALL sp_abrir_pedido(5, 1, @novo);
SELECT @novo;
SELECT * FROM pedido WHERE id_pedido = @novo;


-- QUESTÃO 5

DROP PROCEDURE IF EXISTS sp_adicionar_item;

DELIMITER //

CREATE PROCEDURE sp_adicionar_item(
    IN p_id_pedido  INT,
    IN p_id_produto INT,
    IN p_quantidade INT
)
BEGIN
    DECLARE v_status  VARCHAR(10);
    DECLARE v_preco   DECIMAL(8,2);
    DECLARE v_estoque INT;
    DECLARE v_ativo   BOOLEAN;

    -- 1) Pedido existe e está ABERTO?
    SELECT status
      INTO v_status
      FROM pedido
     WHERE id_pedido = p_id_pedido;

    IF v_status IS NULL OR v_status <> 'ABERTO' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pedido inexistente ou não está ABERTO.';
    END IF;

    -- 2) Produto existe e está ativo?
    SELECT preco, estoque, ativo
      INTO v_preco, v_estoque, v_ativo
      FROM produto
     WHERE id_produto = p_id_produto;

    IF v_preco IS NULL OR v_ativo = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Produto inexistente ou inativo.';
    END IF;

    -- 3) Quantidade válida?
    IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Quantidade deve ser maior que zero.';
    END IF;

    -- 4) Estoque suficiente?
    IF v_estoque < p_quantidade THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Estoque insuficiente para a quantidade pedida.';
    END IF;

    -- 5) Insere o item com o preço atual do produto
    INSERT INTO item_pedido (id_pedido, id_produto, quantidade, preco_unitario)
    VALUES (p_id_pedido, p_id_produto, p_quantidade, v_preco);
END //

DELIMITER ;


CALL sp_adicionar_item(@novo, 2, 2);
SELECT * FROM item_pedido WHERE id_pedido = @novo;

CALL sp_adicionar_item(1, 1, 1);      
CALL sp_adicionar_item(@novo, 15, 1);  
CALL sp_adicionar_item(@novo, 8, 1);


-- QUESTÃO 6

DROP PROCEDURE IF EXISTS sp_finalizar_pedido;

DELIMITER //

CREATE PROCEDURE sp_finalizar_pedido(
	IN p_id_pedido INT
)
BEGIN
    DECLARE v_status  VARCHAR(10);
    DECLARE v_id_cliente INT;
    DECLARE v_quantidade_itens INT;
    DECLARE v_valor_bruto DECIMAL(10,2);
    DECLARE v_desconto DECIMAL(4,2);
    
    SELECT status, id_cliente
      INTO v_status, v_id_cliente
      FROM pedido
     WHERE id_pedido = p_id_pedido;

    IF v_status IS NULL OR v_status <> 'ABERTO' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pedido inexistente ou não está ABERTO.';
    END IF;
    
    SELECT COUNT(*)
      INTO v_quantidade_itens
      FROM item_pedido
     WHERE id_pedido = p_id_pedido;

    IF v_quantidade_itens = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Não é possível finalizar um pedido sem itens.';
    END IF;
	
    SELECT fn_total_pedido(p_id_pedido) INTO v_valor_bruto;
    SELECT fn_desconto_fidelidade(v_id_cliente) INTO v_desconto;

    UPDATE pedido
    SET desconto_percentual = v_desconto,
    valor_total = ROUND(v_valor_bruto - v_valor_bruto * (v_desconto / 100), 2),
    status = 'PAGO'
    WHERE id_pedido = p_id_pedido;
    
END //

DELIMITER ;

CALL sp_finalizar_pedido(10);
CALL sp_finalizar_pedido(9);


-- QUESTÃO 7
DROP PROCEDURE IF EXISTS sp_reajustar_precos_categoria;

DELIMITER //

CREATE PROCEDURE sp_reajustar_precos_categoria(
    IN p_id_categoria INT,
    IN p_percentual   DECIMAL(5,2)
)
BEGIN
    DECLARE v_existe INT;

    SELECT COUNT(*)
      INTO v_existe
      FROM categoria
     WHERE id_categoria = p_id_categoria;

    IF v_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Categoria inexistente.';
    END IF;


    IF p_percentual IS NULL OR p_percentual <= -100 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Percentual inválido: deve ser maior que -100.';
    END IF;


    UPDATE produto
       SET preco = ROUND(preco * (1 + p_percentual / 100), 2)
     WHERE id_categoria = p_id_categoria;
END //

DELIMITER ;


SELECT id_produto, nome, preco FROM produto WHERE id_categoria = 1;
CALL sp_reajustar_precos_categoria(1, 10);
SELECT id_produto, nome, preco FROM produto WHERE id_categoria = 1;

CALL sp_reajustar_precos_categoria(99, 10);    -- erro: categoria inexistente
CALL sp_reajustar_precos_categoria(1, -100);   -- erro: percentual inválido


-- ---------------------------------
-- VIEWS
-- ---------------------------------


-- QUESTÃO 8

DROP VIEW IF EXISTS vw_cardapio;

CREATE VIEW vw_cardapio AS
SELECT
    P.id_produto,
    C.nome AS categoria,
    P.nome AS produto,
    P.preco,
    fn_situacao_estoque(P.id_produto) AS situacao
FROM produto AS P
JOIN categoria AS C USING(id_categoria)
WHERE P.ativo = TRUE;

SELECT * FROM vw_cardapio ORDER BY categoria, produto;
SELECT COUNT(*) FROM vw_cardapio;

-- QUESTÃO 9

DROP VIEW IF EXISTS vw_pedidos_detalhados;

CREATE VIEW vw_pedidos_detalhados AS
SELECT
    P.id_pedido,
    P.data_pedido,
    P.status,
    C.nome AS cliente,
    F.nome AS atendente,
    (SELECT COUNT(*) FROM item_pedido AS IP WHERE IP.id_pedido = P.id_pedido) AS qtd_itens,
    fn_total_pedido(P.id_pedido) AS valor_bruto,
    P.desconto_percentual,
    P.valor_total
FROM pedido AS P
JOIN funcionario AS F USING(id_funcionario)
JOIN cliente AS C USING(id_cliente);

SELECT * FROM vw_pedidos_detalhados WHERE status = 'ABERTO';
SELECT COUNT(*) FROM vw_pedidos_detalhados;


-- QUESTÃO 10
DROP VIEW IF EXISTS vw_produtos_para_repor;

CREATE VIEW vw_produtos_para_repor AS
SELECT
    p.id_produto,
    p.nome AS produto,
    c.nome AS categoria,
    p.estoque,
    p.estoque_minimo,
    (p.estoque_minimo - p.estoque) AS faltam
FROM produto AS p
JOIN categoria AS c USING (id_categoria)
WHERE p.ativo = TRUE AND p.estoque <= p.estoque_minimo;

SELECT * FROM vw_produtos_para_repor;


-- QUESTÃO 11
DROP VIEW IF EXISTS vw_vendas_por_categoria;

CREATE VIEW vw_vendas_por_categoria AS
SELECT
    c.nome AS categoria,
    COALESCE(SUM(v.quantidade), 0)                    AS unidades,
    COALESCE(SUM(v.quantidade * v.preco_unitario), 0) AS faturamento
FROM categoria AS c
LEFT JOIN produto AS p
       ON p.id_categoria = c.id_categoria
LEFT JOIN (
        SELECT ip.id_produto, ip.quantidade, ip.preco_unitario
          FROM item_pedido AS ip
          JOIN pedido AS pe ON pe.id_pedido = ip.id_pedido
         WHERE pe.status = 'PAGO'
     ) AS v
       ON v.id_produto = p.id_produto
GROUP BY c.id_categoria, c.nome;

SELECT * FROM vw_vendas_por_categoria;


-- ---------------------------------
-- TRIGGERS
-- ---------------------------------

-- QUESTÃO 12
DROP TRIGGER IF EXISTS trg_item_baixa_estoque;

DELIMITER //

CREATE TRIGGER trg_item_baixa_estoque
AFTER INSERT ON item_pedido
FOR EACH ROW
BEGIN
    UPDATE produto
        SET estoque = estoque - NEW.quantidade
    WHERE id_produto = NEW.id_produto;
END //

DELIMITER ;


SELECT id_produto, nome, estoque FROM produto WHERE id_produto = 9;   
CALL sp_adicionar_item(@novo, 9, 1);
SELECT id_produto, nome, estoque FROM produto WHERE id_produto = 9;


-- QUESTÃO 13
DROP TRIGGER IF EXISTS trg_item_devolve_estoque;

DELIMITER //

CREATE TRIGGER trg_item_devolve_estoque
AFTER DELETE ON item_pedido
FOR EACH ROW
BEGIN
    UPDATE produto
       SET estoque = estoque + OLD.quantidade
     WHERE id_produto = OLD.id_produto;
END //

DELIMITER ;

-- Teste Q13
SELECT id_produto, estoque FROM produto WHERE id_produto = 9;        
DELETE FROM item_pedido WHERE id_pedido = @novo AND id_produto = 9;
SELECT id_produto, estoque FROM produto WHERE id_produto = 9;       


-- QUESTÃO 14
DROP TRIGGER IF EXISTS trg_produto_historico_preco;

DELIMITER //

CREATE TRIGGER trg_produto_historico_preco
AFTER UPDATE ON produto
FOR EACH ROW
BEGIN
    IF NOT (OLD.preco <=> NEW.preco) THEN
        INSERT INTO historico_preco (id_produto, preco_antigo, preco_novo, usuario)
        VALUES (OLD.id_produto, OLD.preco, NEW.preco, CURRENT_USER());
    END IF;
END //

DELIMITER ;

-- Teste Q14
CALL sp_reajustar_precos_categoria(1, 5);
SELECT * FROM historico_preco;         
UPDATE produto SET estoque = 199 WHERE id_produto = 1;
SELECT * FROM historico_preco;                                   


-- QUESTÃO 15
DROP TRIGGER IF EXISTS trg_pedido_bloqueia_alteracao;

DELIMITER //

CREATE TRIGGER trg_pedido_bloqueia_alteracao
BEFORE UPDATE ON pedido
FOR EACH ROW
BEGIN
    IF OLD.status IN ('PAGO', 'CANCELADO') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Pedido PAGO ou CANCELADO não pode ser alterado.';
    END IF;
END //

DELIMITER ;


CALL sp_finalizar_pedido(@novo);                                  
SELECT id_pedido, status, desconto_percentual, valor_total FROM pedido WHERE id_pedido = @novo;

UPDATE pedido SET valor_total = 1 WHERE id_pedido = 1; 