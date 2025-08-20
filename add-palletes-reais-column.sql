-- Adicionar colunas necessárias na tabela embalagem_notas_bipadas para o novo fluxo
-- que integra com a tabela carros_status

-- 1. Adicionar coluna palletes_reais se não existir
ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS palletes_reais INTEGER;

-- 2. Adicionar coluna data_finalizacao se não existir
ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS data_finalizacao TIMESTAMP WITH TIME ZONE;

-- 3. Adicionar coluna numeros_sap se não existir (para compatibilidade com admin)
ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS numeros_sap TEXT[];

-- 4. Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'embalagem_notas_bipadas' 
AND column_name IN ('palletes_reais', 'data_finalizacao', 'numeros_sap')
ORDER BY column_name;

-- 5. Comentários das novas colunas
COMMENT ON COLUMN embalagem_notas_bipadas.palletes_reais IS 'Quantidade real de pallets utilizados no carro';
COMMENT ON COLUMN embalagem_notas_bipadas.data_finalizacao IS 'Data e hora da finalização do carro';
COMMENT ON COLUMN embalagem_notas_bipadas.numeros_sap IS 'Array de números SAP para carros finalizados pelo admin';
