-- Script para verificar o status atual do constraint
-- Execute este script no Supabase SQL Editor para diagnosticar

-- 1. Verificar se a tabela existe
SELECT 'Tabela notas_consolidado existe' as status, COUNT(*) as total_registros
FROM notas_consolidado;

-- 2. Verificar constraints existentes na tabela
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notas_consolidado'::regclass 
AND contype = 'c'; -- 'c' = check constraint

-- 3. Verificar valores únicos de status na tabela
SELECT status, COUNT(*) as quantidade
FROM notas_consolidado 
GROUP BY status 
ORDER BY status;

-- 4. Testar inserção com diferentes status
-- (Descomente uma linha por vez para testar)

-- Teste 1: Status 'recebida' (deve funcionar)
-- INSERT INTO notas_consolidado (numero_nf, data, volumes, destino, fornecedor, transportadora, usuario, status) 
-- VALUES ('TESTE001', '2024-01-01', 1, 'TESTE', 'TESTE', 'TESTE', 'TESTE', 'recebida');

-- Teste 2: Status 'deu entrada' (pode falhar se constraint não foi atualizado)
-- INSERT INTO notas_consolidado (numero_nf, data, volumes, destino, fornecedor, transportadora, usuario, status) 
-- VALUES ('TESTE002', '2024-01-01', 1, 'TESTE', 'TESTE', 'TESTE', 'TESTE', 'deu entrada');
