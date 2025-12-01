-- Script para corrigir duplicatas na tabela wms_palete_notas
-- Remove registros duplicados mantendo apenas o mais recente (baseado em created_at)

-- 1. Verificar se o constraint UNIQUE existe e criar se necessário
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Verificar se já existe algum constraint UNIQUE para (palete_id, numero_nf)
  SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'wms_palete_notas'
      AND c.contype = 'u'
      AND array_length(c.conkey, 1) = 2
      AND (
        SELECT array_agg(attname ORDER BY attnum)
        FROM pg_attribute
        WHERE attrelid = t.oid
          AND attnum = ANY(c.conkey)
      ) = ARRAY['palete_id', 'numero_nf']
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    -- Criar constraint UNIQUE se não existir
    ALTER TABLE wms_palete_notas 
    ADD CONSTRAINT wms_palete_notas_palete_id_numero_nf_key 
    UNIQUE (palete_id, numero_nf);
    
    RAISE NOTICE 'Constraint UNIQUE criado com sucesso';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE já existe';
  END IF;
END $$;

-- 2. Remover duplicatas mantendo apenas o registro mais recente
-- Para cada combinação de palete_id e numero_nf, manter apenas o registro com maior created_at
DELETE FROM wms_palete_notas
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY palete_id, numero_nf 
        ORDER BY created_at DESC
      ) as rn
    FROM wms_palete_notas
  ) t
  WHERE rn > 1
);

-- 3. Verificar quantas duplicatas foram removidas
DO $$
DECLARE
  duplicatas_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicatas_count
  FROM (
    SELECT palete_id, numero_nf, COUNT(*) as cnt
    FROM wms_palete_notas
    GROUP BY palete_id, numero_nf
    HAVING COUNT(*) > 1
  ) duplicatas;
  
  IF duplicatas_count > 0 THEN
    RAISE NOTICE 'Ainda existem % combinações duplicadas', duplicatas_count;
  ELSE
    RAISE NOTICE 'Todas as duplicatas foram removidas com sucesso';
  END IF;
END $$;

-- 4. Verificar se ainda há duplicatas
SELECT 
  palete_id, 
  numero_nf, 
  COUNT(*) as quantidade
FROM wms_palete_notas
GROUP BY palete_id, numero_nf
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

