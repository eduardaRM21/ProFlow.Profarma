-- Script OPCIONAL para migrar códigos de paletes existentes
-- ATENÇÃO: Este script é opcional e só deve ser executado se você quiser
-- renumerar os paletes existentes. Os novos paletes já usarão o novo formato.

-- 1. Verificar quantos paletes existem
SELECT COUNT(*) as total_paletes FROM wms_paletes;

-- 2. Verificar códigos atuais (amostra)
SELECT codigo_palete, created_at 
FROM wms_paletes 
ORDER BY created_at 
LIMIT 10;

-- 3. Se quiser migrar os códigos existentes, descomente o código abaixo:
/*
-- ATENÇÃO: Este processo irá:
-- 1. Gerar novos códigos para todos os paletes existentes
-- 2. Atualizar referências em outras tabelas
-- 3. Manter a ordem cronológica

DO $$
DECLARE
  palete_record RECORD;
  novo_codigo TEXT;
  contador INTEGER := 0;
BEGIN
  -- Desabilitar temporariamente o constraint UNIQUE para permitir atualizações
  ALTER TABLE wms_paletes DROP CONSTRAINT IF EXISTS wms_paletes_codigo_palete_key;
  
  -- Atualizar códigos em ordem cronológica
  FOR palete_record IN 
    SELECT id, codigo_palete 
    FROM wms_paletes 
    ORDER BY created_at ASC
  LOOP
    -- Gerar novo código usando a sequência
    SELECT gerar_codigo_palete() INTO novo_codigo;
    
    -- Atualizar o código do palete
    UPDATE wms_paletes 
    SET codigo_palete = novo_codigo 
    WHERE id = palete_record.id;
    
    contador := contador + 1;
    
    -- Log a cada 100 registros
    IF contador % 100 = 0 THEN
      RAISE NOTICE 'Migrados % paletes...', contador;
    END IF;
  END LOOP;
  
  -- Reabilitar o constraint UNIQUE
  ALTER TABLE wms_paletes 
  ADD CONSTRAINT wms_paletes_codigo_palete_key UNIQUE (codigo_palete);
  
  RAISE NOTICE 'Migração concluída! Total de paletes migrados: %', contador;
END $$;
*/

-- 4. Verificar códigos após migração (se executou)
-- SELECT codigo_palete, created_at 
-- FROM wms_paletes 
-- ORDER BY created_at 
-- LIMIT 10;

