-- Adicionar coluna palletes_reais na tabela carros_status
-- para armazenar a quantidade real de pallets utilizados

-- 1. Adicionar coluna palletes_reais se não existir
ALTER TABLE carros_status 
ADD COLUMN IF NOT EXISTS palletes_reais INTEGER;

-- 2. Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'carros_status' 
AND column_name = 'palletes_reais';

-- 3. Comentário da nova coluna
COMMENT ON COLUMN carros_status.palletes_reais IS 'Quantidade real de pallets utilizados no carro (diferente da estimativa)';

-- 4. Verificar estrutura atual da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'carros_status' 
ORDER BY ordinal_position;
