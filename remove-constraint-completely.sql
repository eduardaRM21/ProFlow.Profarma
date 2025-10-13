-- Script para REMOVER COMPLETAMENTE o constraint de status
-- Execute este script no Supabase SQL Editor

-- 1. Remover TODOS os constraints de check da tabela
ALTER TABLE notas_consolidado DROP CONSTRAINT IF EXISTS notas_consolidado_status_check;

-- 2. Verificar se foi removido
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notas_consolidado'::regclass 
AND contype = 'c';

-- 3. Testar inserção com status 'deu entrada'
INSERT INTO notas_consolidado (numero_nf, data, volumes, destino, fornecedor, transportadora, usuario, status) 
VALUES ('TESTE_DELETE', '2024-01-01', 1, 'TESTE', 'TESTE', 'TESTE', 'TESTE', 'deu entrada');

-- 4. Limpar o teste
DELETE FROM notas_consolidado WHERE numero_nf = 'TESTE_DELETE';

-- 5. Confirmar sucesso
SELECT 'Constraint removido com sucesso! Agora aceita qualquer status.' as resultado;
