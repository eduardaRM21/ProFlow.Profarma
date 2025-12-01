-- Script para corrigir constraint de status na tabela wms_paletes
-- Primeiro verifica e corrige dados inválidos, depois adiciona o constraint

-- 1. Verificar quais status inválidos existem na tabela
SELECT 
  status,
  COUNT(*) as quantidade
FROM wms_paletes
WHERE status NOT IN ('em_montagem', 'aguardando_armazenagem', 'armazenado', 'em_movimento', 'expedido')
GROUP BY status;

-- 2. Verificar se há registros com status NULL
SELECT 
  COUNT(*) as registros_com_status_null
FROM wms_paletes
WHERE status IS NULL;

-- 3. Remover constraint antigo se existir (pode ter nome diferente)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Encontrar o nome do constraint de status
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'wms_paletes'
    AND c.contype = 'c'
    AND c.conname LIKE '%status%'
  LIMIT 1;
  
  -- Remover constraint se encontrado
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE wms_paletes DROP CONSTRAINT IF EXISTS ' || constraint_name;
    RAISE NOTICE 'Constraint antigo removido: %', constraint_name;
  ELSE
    RAISE NOTICE 'Nenhum constraint de status encontrado para remover';
  END IF;
END $$;

-- 4. Se houver status 'aguardando_agendamento' (antigo), atualizar para 'aguardando_armazenagem'
UPDATE wms_paletes
SET status = 'aguardando_armazenagem'
WHERE status = 'aguardando_agendamento';

-- 5. Corrigir status inválidos restantes (atualizar para 'em_montagem' como padrão seguro)
UPDATE wms_paletes
SET status = 'em_montagem'
WHERE status IS NULL 
   OR status NOT IN ('em_montagem', 'aguardando_armazenagem', 'armazenado', 'em_movimento', 'expedido');

-- 6. Verificar se ainda há status inválidos
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM wms_paletes
  WHERE status IS NULL 
     OR status NOT IN ('em_montagem', 'aguardando_armazenagem', 'armazenado', 'em_movimento', 'expedido');
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'Ainda existem % registros com status inválido', invalid_count;
  ELSE
    RAISE NOTICE 'Todos os registros têm status válido';
  END IF;
END $$;

-- 7. Adicionar o constraint (agora deve funcionar)
DO $$
BEGIN
  -- Verificar se o constraint já existe
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'wms_paletes'
      AND c.contype = 'c'
      AND c.conname = 'wms_paletes_status_check'
  ) THEN
    ALTER TABLE wms_paletes 
    ADD CONSTRAINT wms_paletes_status_check 
    CHECK (status IN ('em_montagem', 'aguardando_armazenagem', 'armazenado', 'em_movimento', 'expedido'));
    
    RAISE NOTICE 'Constraint wms_paletes_status_check criado com sucesso';
  ELSE
    RAISE NOTICE 'Constraint wms_paletes_status_check já existe';
  END IF;
END $$;

-- 8. Verificar o constraint criado
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'wms_paletes'::regclass
  AND conname = 'wms_paletes_status_check';

-- 9. Mostrar resumo dos status atuais
SELECT 
  status,
  COUNT(*) as quantidade
FROM wms_paletes
GROUP BY status
ORDER BY quantidade DESC;

