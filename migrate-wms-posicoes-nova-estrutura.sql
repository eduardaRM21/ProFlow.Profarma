-- Script de migração para nova estrutura de endereçamento WMS
-- Execute este script no SQL Editor do Supabase
-- 
-- Nova estrutura:
-- Rua CA: CA-001-01 até CA-050-06 (50 colunas × 6 níveis = 300 posições)
-- Rua CB: CB-001-01 até CB-060-06 (60 colunas × 6 níveis = 360 posições)
-- Rua PD - Porta-Palete Direita: 546 posições
-- Rua PD - Porta-Palete Esquerda: 378 posições
-- Total: 1.584 posições

-- IMPORTANTE: Este script remove apenas posições disponíveis
-- Posições ocupadas serão preservadas e migradas manualmente se necessário

BEGIN;

-- 1. Remover apenas posições disponíveis (preservar ocupadas e bloqueadas)
DELETE FROM wms_posicoes WHERE status = 'disponivel';

-- 2. Remover constraint e índice do campo corredor
ALTER TABLE wms_posicoes 
  DROP CONSTRAINT IF EXISTS wms_posicoes_corredor_check;

DROP INDEX IF EXISTS idx_wms_posicoes_corredor_rua_nivel;

-- 3. Remover o campo corredor
ALTER TABLE wms_posicoes 
  DROP COLUMN IF EXISTS corredor;

-- 3.1. Adicionar coluna posicao (número da posição: 001, 020, etc.)
ALTER TABLE wms_posicoes 
  ADD COLUMN IF NOT EXISTS posicao INTEGER;

-- 4. Ajustar constraint de nível para permitir até 7 níveis (para Rua PD)
ALTER TABLE wms_posicoes 
  DROP CONSTRAINT IF EXISTS wms_posicoes_nivel_check;

ALTER TABLE wms_posicoes 
  ADD CONSTRAINT wms_posicoes_nivel_check 
  CHECK (nivel >= 1 AND nivel <= 7);

-- 5. Ajustar constraint de rua (agora temos CA, CB e PD)
-- Vamos usar números: 1=CA, 2=CB, 3=PD
ALTER TABLE wms_posicoes 
  DROP CONSTRAINT IF EXISTS wms_posicoes_rua_check;

ALTER TABLE wms_posicoes 
  ADD CONSTRAINT wms_posicoes_rua_check 
  CHECK (rua >= 1 AND rua <= 3);

-- 6. Criar função para gerar código de posição no novo formato
-- Formato: PREFIXO-XXX-YY (ex: CA-001-01, CB-060-06, PD-001-01)
CREATE OR REPLACE FUNCTION gerar_codigo_posicao_novo(
  prefixo TEXT,
  coluna_num INTEGER,
  nivel_num INTEGER
)
RETURNS TEXT AS
$func$
  SELECT prefixo || '-' || 
         LPAD(coluna_num::TEXT, 3, '0') || '-' || 
         LPAD(nivel_num::TEXT, 2, '0');
$func$ LANGUAGE sql IMMUTABLE;

-- 7. Criar posições da Rua CA: CA-001-01 até CA-050-06
-- 50 colunas × 6 níveis = 300 posições
INSERT INTO wms_posicoes (codigo_posicao, rua, nivel, posicao, status)
SELECT 
  gerar_codigo_posicao_novo('CA', coluna, nivel),
  1, -- Rua CA
  nivel,
  coluna, -- Posição numérica
  'disponivel'
FROM generate_series(1, 50) AS coluna,
     generate_series(1, 6) AS nivel
ON CONFLICT (codigo_posicao) DO NOTHING;

-- 8. Criar posições da Rua CB: CB-001-01 até CB-060-06
-- 60 colunas × 6 níveis = 360 posições
INSERT INTO wms_posicoes (codigo_posicao, rua, nivel, posicao, status)
SELECT 
  gerar_codigo_posicao_novo('CB', coluna, nivel),
  2, -- Rua CB
  nivel,
  coluna, -- Posição numérica
  'disponivel'
FROM generate_series(1, 60) AS coluna,
     generate_series(1, 6) AS nivel
ON CONFLICT (codigo_posicao) DO NOTHING;

-- 9. Criar posições da Rua PD - Porta-Palete Direita
-- 24 colunas físicas com 7 níveis e 3 posições por nível = 24 × 7 × 3 = 504 posições
-- 3 colunas físicas com 7 níveis e 2 posições por nível = 3 × 7 × 2 = 42 posições
-- Total: 546 posições
-- Numeração: PD-001-01 até PD-078-07 (78 colunas lógicas × 7 níveis)
-- 
-- Estrutura: Cada coluna física gera múltiplas colunas lógicas
-- - 24 colunas físicas × 3 posições = 72 colunas lógicas (1-72)
-- - 3 colunas físicas × 2 posições = 6 colunas lógicas (73-78)

-- Primeiras 24 colunas físicas: 3 posições por nível = 72 colunas lógicas
-- Coluna física 1 gera colunas lógicas 1, 2, 3
-- Coluna física 2 gera colunas lógicas 4, 5, 6
-- etc.
INSERT INTO wms_posicoes (codigo_posicao, rua, nivel, posicao, status)
SELECT 
  gerar_codigo_posicao_novo('PD', 
    ((coluna_fisica - 1) * 3) + posicao, 
    nivel
  ),
  3, -- Rua PD
  nivel,
  ((coluna_fisica - 1) * 3) + posicao, -- Posição numérica (coluna lógica)
  'disponivel'
FROM generate_series(1, 24) AS coluna_fisica,
     generate_series(1, 7) AS nivel,
     generate_series(1, 3) AS posicao
ON CONFLICT (codigo_posicao) DO NOTHING;

-- Próximas 3 colunas físicas: 2 posições por nível = 6 colunas lógicas (73-78)
-- Coluna física 25 gera colunas lógicas 73, 74
-- Coluna física 26 gera colunas lógicas 75, 76
-- Coluna física 27 gera colunas lógicas 77, 78
INSERT INTO wms_posicoes (codigo_posicao, rua, nivel, posicao, status)
SELECT 
  gerar_codigo_posicao_novo('PD', 
    (24 * 3) + ((coluna_fisica - 24 - 1) * 2) + posicao, 
    nivel
  ),
  3, -- Rua PD
  nivel,
  (24 * 3) + ((coluna_fisica - 24 - 1) * 2) + posicao, -- Posição numérica (coluna lógica)
  'disponivel'
FROM generate_series(25, 27) AS coluna_fisica,
     generate_series(1, 7) AS nivel,
     generate_series(1, 2) AS posicao
ON CONFLICT (codigo_posicao) DO NOTHING;

-- 10. Criar posições da Rua PD - Porta-Palete Esquerda
-- 27 colunas físicas com 7 níveis e 2 posições por nível = 27 × 7 × 2 = 378 posições
-- 27 colunas físicas × 2 posições = 54 colunas lógicas (79-132)
-- Numeração: PD-079-01 até PD-132-07
INSERT INTO wms_posicoes (codigo_posicao, rua, nivel, posicao, status)
SELECT 
  gerar_codigo_posicao_novo('PD', 
    78 + ((coluna_fisica - 27 - 1) * 2) + posicao, 
    nivel
  ),
  3, -- Rua PD
  nivel,
  78 + ((coluna_fisica - 27 - 1) * 2) + posicao, -- Posição numérica (coluna lógica)
  'disponivel'
FROM generate_series(28, 54) AS coluna_fisica, -- 27 colunas físicas (28 a 54)
     generate_series(1, 7) AS nivel,
     generate_series(1, 2) AS posicao
ON CONFLICT (codigo_posicao) DO NOTHING;

-- 11. Remover função auxiliar
DROP FUNCTION IF EXISTS gerar_codigo_posicao_novo(TEXT, INTEGER, INTEGER);

-- 12. Criar novos índices
CREATE INDEX IF NOT EXISTS idx_wms_posicoes_rua_nivel 
  ON wms_posicoes(rua, nivel);

CREATE INDEX IF NOT EXISTS idx_wms_posicoes_posicao 
  ON wms_posicoes(posicao);

-- 13. Verificar totais criados
SELECT 
  rua,
  CASE 
    WHEN rua = 1 THEN 'CA'
    WHEN rua = 2 THEN 'CB'
    WHEN rua = 3 THEN 'PD'
  END as sigla_rua,
  COUNT(*) as total_posicoes,
  COUNT(CASE WHEN status = 'disponivel' THEN 1 END) as disponiveis,
  COUNT(CASE WHEN status = 'ocupada' THEN 1 END) as ocupadas,
  COUNT(CASE WHEN status = 'bloqueada' THEN 1 END) as bloqueadas,
  MIN(posicao) as posicao_min,
  MAX(posicao) as posicao_max
FROM wms_posicoes
GROUP BY rua
ORDER BY rua;

-- 14. Total geral
SELECT 
  COUNT(*) as total_posicoes,
  COUNT(CASE WHEN status = 'disponivel' THEN 1 END) as disponiveis,
  COUNT(CASE WHEN status = 'ocupada' THEN 1 END) as ocupadas,
  COUNT(CASE WHEN status = 'bloqueada' THEN 1 END) as bloqueadas
FROM wms_posicoes;

-- 15. Verificar alguns exemplos de códigos gerados
SELECT codigo_posicao, rua, nivel, posicao, status
FROM wms_posicoes
WHERE codigo_posicao IN (
  'CA-001-01', 'CA-050-06', 
  'CB-001-01', 'CB-060-06', 
  'PD-001-01', 'PD-003-01', 'PD-078-07', 'PD-079-01', 'PD-132-07'
)
ORDER BY codigo_posicao;

COMMIT;

-- ============================================================
-- RESUMO DA MIGRAÇÃO
-- ============================================================
-- 
-- Estrutura criada:
-- - Rua CA (rua=1): CA-001-01 até CA-050-06 = 300 posições
-- - Rua CB (rua=2): CB-001-01 até CB-060-06 = 360 posições
-- - Rua PD (rua=3): PD-001-01 até PD-132-07 = 924 posições
--   - Porta-Palete Direita: PD-001-01 até PD-078-07 = 546 posições
--   - Porta-Palete Esquerda: PD-079-01 até PD-132-07 = 378 posições
-- 
-- Total: 1.584 posições
-- 
-- Alterações no banco:
-- - Campo "corredor" removido
-- - Campo "rua" agora usa: 1=CA, 2=CB, 3=PD
-- - Campo "nivel" agora permite até 7 níveis (para Rua PD)
-- - Índice atualizado: idx_wms_posicoes_rua_nivel
-- 
-- NOTA: Após executar este script, você precisará atualizar o código da aplicação
-- para remover referências ao campo "corredor" e usar apenas "rua" e "nivel"
-- 
-- Arquivos que precisam ser atualizados:
-- - lib/wms-service.ts (remover referências a corredor)
-- - app/wms/armazenagem/page.tsx (remover coluna corredor da tabela)
-- - components/wms/* (remover exibição de corredor)
-- - lib/wms-utils.ts (atualizar função obterSiglaRua para incluir PD)

