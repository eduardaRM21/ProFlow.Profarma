-- Script para reverter o status das notas após corrigir o constraint
-- Execute este script APÓS executar fix-status-constraint-urgent.sql

-- 1. Atualizar todas as notas que foram salvas com status 'recebida' para 'deu entrada'
-- (apenas as que foram inseridas recentemente e ainda não foram bipadas)
UPDATE notas_consolidado 
SET status = 'deu entrada' 
WHERE status = 'recebida' 
AND data_entrada >= NOW() - INTERVAL '1 day'; -- Ajuste o intervalo conforme necessário

-- 2. Verificar o resultado
SELECT status, COUNT(*) as quantidade 
FROM notas_consolidado 
GROUP BY status 
ORDER BY status;

-- 3. Verificar notas recentes
SELECT numero_nf, status, data_entrada 
FROM notas_consolidado 
WHERE data_entrada >= NOW() - INTERVAL '1 day'
ORDER BY data_entrada DESC;
