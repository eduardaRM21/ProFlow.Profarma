-- Script para ajustar a capacidade do WMS conforme estrutura física
-- Execute este script no SQL Editor do Supabase

-- Estrutura:
-- Rua CA: 2 porta paletes
--   - Porta palete 1: 12 colunas, 6 níveis, cada nível 2 posições (144 posições)
--   - Porta palete 2: 15 colunas, 6 níveis, cada nível 2 posições (180 posições)
-- Rua CB: 1 porta palete
--   - 15 colunas, 6 níveis, cada nível 2 posições (180 posições)
-- Rua CC: 1 porta palete
--   - 16 colunas, 6 níveis, cada nível 2 posições (192 posições)
-- Total: 696 posições

-- IMPORTANTE: Este script remove apenas posições disponíveis e cria novas
-- Posições ocupadas serão preservadas

-- Primeiro, ajustar a constraint de nível para permitir até 6 níveis
ALTER TABLE wms_posicoes 
  DROP CONSTRAINT IF EXISTS wms_posicoes_nivel_check;

ALTER TABLE wms_posicoes 
  ADD CONSTRAINT wms_posicoes_nivel_check 
  CHECK (nivel >= 1 AND nivel <= 6);

-- Remover apenas posições disponíveis (mais seguro)
DELETE FROM wms_posicoes WHERE status = 'disponivel';

-- Criar função para gerar código de posição no formato CA-XXX-YY
-- Formato: Prefixo (CA/CB/CC) - Coluna (3 dígitos) - Nível (2 dígitos)
-- Para 2 posições por nível, usamos colunas sequenciais (ex: 001, 002 para mesma coluna física)
CREATE OR REPLACE FUNCTION gerar_codigo_posicao_completo(
  prefixo TEXT,
  coluna_num INTEGER,
  nivel_num INTEGER,
  posicao_num INTEGER
)
RETURNS TEXT AS
$func$
  SELECT prefixo || '-' || 
         LPAD((coluna_num + (posicao_num - 1) * 100)::TEXT, 3, '0') || '-' || 
         LPAD(nivel_num::TEXT, 2, '0');
$func$ LANGUAGE sql IMMUTABLE;

-- Inserir posições usando generate_series (mais compatível)
-- Formato de código: CA-XXX-YY (ex: CA-007-07)
-- Rua CA, Porta palete 1 (corredor 1): 12 colunas, 6 níveis, 2 posições
-- Colunas numeradas de 1 a 12
INSERT INTO wms_posicoes (codigo_posicao, corredor, rua, nivel, status)
SELECT 
  gerar_codigo_posicao_completo('CA', coluna, nivel, posicao),
  1,
  1,
  nivel,
  'disponivel'
FROM generate_series(1, 12) AS coluna,
     generate_series(1, 6) AS nivel,
     generate_series(1, 2) AS posicao
ON CONFLICT (codigo_posicao) DO NOTHING;

-- Rua CA, Porta palete 2 (corredor 2): 15 colunas, 6 níveis, 2 posições
-- Colunas numeradas de 13 a 27 (continuando a sequência do porta palete 1)
INSERT INTO wms_posicoes (codigo_posicao, corredor, rua, nivel, status)
SELECT 
  gerar_codigo_posicao_completo('CA', coluna + 12, nivel, posicao),
  2,
  1,
  nivel,
  'disponivel'
FROM generate_series(1, 15) AS coluna,
     generate_series(1, 6) AS nivel,
     generate_series(1, 2) AS posicao
ON CONFLICT (codigo_posicao) DO NOTHING;

-- Rua CB (corredor 3): 15 colunas, 6 níveis, 2 posições
-- Prefixo: CB
INSERT INTO wms_posicoes (codigo_posicao, corredor, rua, nivel, status)
SELECT 
  gerar_codigo_posicao_completo('CB', coluna, nivel, posicao),
  3,
  2,
  nivel,
  'disponivel'
FROM generate_series(1, 15) AS coluna,
     generate_series(1, 6) AS nivel,
     generate_series(1, 2) AS posicao
ON CONFLICT (codigo_posicao) DO NOTHING;

-- Rua CC (corredor 4): 16 colunas, 6 níveis, 2 posições
-- Prefixo: CC
INSERT INTO wms_posicoes (codigo_posicao, corredor, rua, nivel, status)
SELECT 
  gerar_codigo_posicao_completo('CC', coluna, nivel, posicao),
  4,
  3,
  nivel,
  'disponivel'
FROM generate_series(1, 16) AS coluna,
     generate_series(1, 6) AS nivel,
     generate_series(1, 2) AS posicao
ON CONFLICT (codigo_posicao) DO NOTHING;

-- Remover a função auxiliar
DROP FUNCTION gerar_codigo_posicao_completo(TEXT, INTEGER, INTEGER, INTEGER);

-- Verificar o total de posições criadas
SELECT 
  rua,
  corredor,
  COUNT(*) as total_posicoes,
  COUNT(CASE WHEN status = 'disponivel' THEN 1 END) as disponiveis,
  COUNT(CASE WHEN status = 'ocupada' THEN 1 END) as ocupadas,
  COUNT(CASE WHEN status = 'bloqueada' THEN 1 END) as bloqueadas
FROM wms_posicoes
WHERE rua IN (1, 2, 3)
GROUP BY rua, corredor
ORDER BY rua, corredor;

-- Total geral
SELECT 
  COUNT(*) as total_posicoes,
  COUNT(CASE WHEN status = 'disponivel' THEN 1 END) as disponiveis,
  COUNT(CASE WHEN status = 'ocupada' THEN 1 END) as ocupadas,
  COUNT(CASE WHEN status = 'bloqueada' THEN 1 END) as bloqueadas
FROM wms_posicoes
WHERE rua IN (1, 2, 3);
