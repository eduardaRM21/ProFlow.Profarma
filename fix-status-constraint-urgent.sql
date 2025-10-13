-- Script URGENTE para corrigir o constraint de status
-- Execute este script no Supabase SQL Editor IMEDIATAMENTE

-- 1. Remover o constraint antigo
ALTER TABLE notas_consolidado DROP CONSTRAINT IF EXISTS notas_consolidado_status_check;

-- 2. Adicionar o novo constraint que aceita 'deu entrada'
ALTER TABLE notas_consolidado ADD CONSTRAINT notas_consolidado_status_check 
  CHECK (status IN ('deu entrada', 'recebida', 'processada', 'finalizada', 'cancelada'));

-- 3. Verificar se o constraint foi aplicado corretamente
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'notas_consolidado'::regclass 
AND conname = 'notas_consolidado_status_check';

-- 4. Testar inserção com status 'deu entrada' (opcional - pode remover após testar)
-- INSERT INTO notas_consolidado (numero_nf, data, volumes, destino, fornecedor, transportadora, usuario, status) 
-- VALUES ('TESTE123', '2024-01-01', 1, 'TESTE', 'TESTE', 'TESTE', 'TESTE', 'deu entrada');
