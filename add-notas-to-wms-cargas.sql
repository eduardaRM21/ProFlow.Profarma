-- Adicionar coluna notas (JSONB) na tabela wms_cargas para armazenar todas as notas do carro
-- Esta coluna armazenará um array com todas as notas fiscais associadas à carga

ALTER TABLE wms_cargas 
ADD COLUMN IF NOT EXISTS notas JSONB DEFAULT '[]'::jsonb;

-- Criar índice GIN para melhor performance em consultas JSONB
CREATE INDEX IF NOT EXISTS idx_wms_cargas_notas ON wms_cargas USING GIN (notas);

-- Comentário da coluna
COMMENT ON COLUMN wms_cargas.notas IS 'Array JSONB com todas as notas fiscais associadas à carga';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'wms_cargas' 
  AND column_name = 'notas';

