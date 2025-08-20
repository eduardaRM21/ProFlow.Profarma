-- =====================================================
-- ADICIONAR CAMPOS NECESSÁRIOS PARA STATUS DOS CARROS
-- =====================================================

-- Adicionar campo para números SAP
ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS numeros_sap TEXT[];

-- Adicionar campo para data de finalização
ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS data_finalizacao TIMESTAMP WITH TIME ZONE;

-- Adicionar comentários para os novos campos
COMMENT ON COLUMN embalagem_notas_bipadas.numeros_sap IS 'Array de números SAP para carros finalizados';
COMMENT ON COLUMN embalagem_notas_bipadas.data_finalizacao IS 'Data e hora da finalização do carro';

-- Atualizar valores padrão para campos existentes
UPDATE embalagem_notas_bipadas 
SET numeros_sap = ARRAY[]::TEXT[] 
WHERE numeros_sap IS NULL;

-- Verificar se os campos foram adicionados
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'embalagem_notas_bipadas' 
AND column_name IN ('numeros_sap', 'data_finalizacao')
ORDER BY column_name;
