-- Script SIMPLES para corrigir o constraint de status
-- Execute este script no Supabase SQL Editor

-- 1. Remover o constraint antigo
ALTER TABLE notas_consolidado DROP CONSTRAINT IF EXISTS notas_consolidado_status_check;

-- 2. Adicionar o novo constraint que aceita 'deu entrada'
ALTER TABLE notas_consolidado ADD CONSTRAINT notas_consolidado_status_check 
  CHECK (status IN ('deu entrada', 'recebida', 'processada', 'finalizada', 'cancelada'));

-- 3. Verificar se funcionou
SELECT 'Constraint atualizado com sucesso!' as resultado;
