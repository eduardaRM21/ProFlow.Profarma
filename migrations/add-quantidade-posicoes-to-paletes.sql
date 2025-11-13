-- Adicionar campo quantidade_posicoes na tabela wms_paletes
-- Execute este script no SQL Editor do Supabase

ALTER TABLE wms_paletes 
ADD COLUMN IF NOT EXISTS quantidade_posicoes INTEGER DEFAULT 1;

-- Comentário do campo
COMMENT ON COLUMN wms_paletes.quantidade_posicoes IS 'Quantidade de posições necessárias no porta palete para este palete';

