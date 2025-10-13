-- Script para atualizar o status padrão das notas no consolidado
-- Execute este script no Supabase SQL Editor

-- 1. Atualizar o valor padrão da coluna status
ALTER TABLE notas_consolidado ALTER COLUMN status SET DEFAULT 'deu entrada';

-- 2. Atualizar o CHECK constraint para incluir 'deu entrada'
ALTER TABLE notas_consolidado DROP CONSTRAINT IF EXISTS notas_consolidado_status_check;
ALTER TABLE notas_consolidado ADD CONSTRAINT notas_consolidado_status_check 
  CHECK (status IN ('deu entrada', 'recebida', 'processada', 'finalizada', 'cancelada'));

-- 3. Atualizar todas as notas existentes que têm status 'recebida' para 'deu entrada'
-- (apenas se você quiser que as notas já existentes tenham o status correto)
UPDATE notas_consolidado 
SET status = 'deu entrada' 
WHERE status = 'recebida';

-- 4. Verificar o resultado
SELECT status, COUNT(*) as quantidade 
FROM notas_consolidado 
GROUP BY status 
ORDER BY status;
