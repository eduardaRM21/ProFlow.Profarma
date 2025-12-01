-- Script para verificar se as funções de geração de códigos existem
-- Execute este script no Supabase SQL Editor para verificar o status

-- 1. Verificar função gerar_codigo_palete
SELECT 
  'Função gerar_codigo_palete' as funcao,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'gerar_codigo_palete'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status;

-- 2. Verificar função gerar_codigo_carga
SELECT 
  'Função gerar_codigo_carga' as funcao,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'gerar_codigo_carga'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status;

-- 3. Verificar sequência wms_palete_codigo_seq
SELECT 
  'Sequência wms_palete_codigo_seq' as sequencia,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_sequences 
      WHERE sequencename = 'wms_palete_codigo_seq'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status;

-- 4. Verificar sequência wms_carga_codigo_seq
SELECT 
  'Sequência wms_carga_codigo_seq' as sequencia,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_sequences 
      WHERE sequencename = 'wms_carga_codigo_seq'
    ) THEN '✅ EXISTE'
    ELSE '❌ NÃO EXISTE'
  END as status;

-- 5. Testar função gerar_codigo_palete (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gerar_codigo_palete') THEN
    RAISE NOTICE 'Teste gerar_codigo_palete(): %', gerar_codigo_palete();
  ELSE
    RAISE NOTICE 'Função gerar_codigo_palete() não existe';
  END IF;
END $$;

-- 6. Testar função gerar_codigo_carga (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gerar_codigo_carga') THEN
    RAISE NOTICE 'Teste gerar_codigo_carga(): %', gerar_codigo_carga();
  ELSE
    RAISE NOTICE 'Função gerar_codigo_carga() não existe';
  END IF;
END $$;

-- 7. Verificar códigos atuais na tabela wms_cargas (amostra)
SELECT 
  codigo_carga,
  LENGTH(codigo_carga) as tamanho,
  created_at
FROM wms_cargas
ORDER BY created_at DESC
LIMIT 10;

-- 8. Verificar códigos atuais na tabela wms_paletes (amostra)
SELECT 
  codigo_palete,
  LENGTH(codigo_palete) as tamanho,
  created_at
FROM wms_paletes
ORDER BY created_at DESC
LIMIT 10;

