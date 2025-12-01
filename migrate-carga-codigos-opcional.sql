-- Script OPCIONAL para migrar códigos de cargas existentes
-- ATENÇÃO: Este script é opcional e só deve ser executado se você quiser
-- renumerar as cargas existentes. As novas cargas já usarão o novo formato.

-- 1. Verificar quantas cargas existem
SELECT COUNT(*) as total_cargas FROM wms_cargas;

-- 2. Verificar códigos atuais (amostra)
SELECT codigo_carga, created_at 
FROM wms_cargas 
ORDER BY created_at 
LIMIT 10;

-- 3. Se quiser migrar os códigos existentes, descomente o código abaixo:
/*
-- ATENÇÃO: Este processo irá:
-- 1. Gerar novos códigos para todas as cargas existentes
-- 2. Manter a ordem cronológica

DO $$
DECLARE
  carga_record RECORD;
  novo_codigo TEXT;
  contador INTEGER := 0;
BEGIN
  -- Desabilitar temporariamente o constraint UNIQUE para permitir atualizações
  ALTER TABLE wms_cargas DROP CONSTRAINT IF EXISTS wms_cargas_codigo_carga_key;
  
  -- Atualizar códigos em ordem cronológica
  FOR carga_record IN 
    SELECT id, codigo_carga 
    FROM wms_cargas 
    ORDER BY created_at ASC
  LOOP
    -- Gerar novo código usando a sequência
    SELECT gerar_codigo_carga() INTO novo_codigo;
    
    -- Atualizar o código da carga
    UPDATE wms_cargas 
    SET codigo_carga = novo_codigo 
    WHERE id = carga_record.id;
    
    contador := contador + 1;
    
    -- Log a cada 100 registros
    IF contador % 100 = 0 THEN
      RAISE NOTICE 'Migradas % cargas...', contador;
    END IF;
  END LOOP;
  
  -- Reabilitar o constraint UNIQUE
  ALTER TABLE wms_cargas 
  ADD CONSTRAINT wms_cargas_codigo_carga_key UNIQUE (codigo_carga);
  
  RAISE NOTICE 'Migração concluída! Total de cargas migradas: %', contador;
END $$;
*/

-- 4. Verificar códigos após migração (se executou)
-- SELECT codigo_carga, created_at 
-- FROM wms_cargas 
-- ORDER BY created_at 
-- LIMIT 10;

