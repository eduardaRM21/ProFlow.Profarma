-- =====================================================
-- ATUALIZAÇÃO COMPLETA DO BANCO DE DADOS
-- Para ser executado no SQL Editor do Supabase
-- =====================================================

-- 1. ADICIONAR CAMPOS NECESSÁRIOS PARA STATUS DOS CARROS
-- =====================================================

-- Adicionar campo para números SAP
ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS numeros_sap TEXT[];

-- Adicionar campo para data de finalização
ALTER TABLE embalagem_notas_bipadas 
ADD COLUMN IF NOT EXISTS data_finalizacao TIMESTAMP WITH TIME ZONE;

-- 2. ADICIONAR COMENTÁRIOS PARA OS NOVOS CAMPOS
-- =====================================================

COMMENT ON COLUMN embalagem_notas_bipadas.numeros_sap IS 'Array de números SAP para carros finalizados';
COMMENT ON COLUMN embalagem_notas_bipadas.data_finalizacao IS 'Data e hora da finalização do carro';

-- 3. ATUALIZAR VALORES PADRÃO PARA CAMPOS EXISTENTES
-- =====================================================

UPDATE embalagem_notas_bipadas 
SET numeros_sap = ARRAY[]::TEXT[] 
WHERE numeros_sap IS NULL;

-- 4. VERIFICAR SE OS CAMPOS FORAM ADICIONADOS
-- =====================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'embalagem_notas_bipadas' 
AND column_name IN ('numeros_sap', 'data_finalizacao')
ORDER BY column_name;

-- 5. VERIFICAR ESTRUTURA COMPLETA DA TABELA
-- =====================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'embalagem_notas_bipadas' 
ORDER BY ordinal_position;

-- 6. VERIFICAR ESTRUTURA DA TABELA ATUALIZADA
-- =====================================================

-- A tabela foi atualizada com sucesso
-- Os novos campos numeros_sap e data_finalizacao estão disponíveis

-- 10. RESUMO FINAL
-- =====================================================

SELECT 
    'ATUALIZAÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN numeros_sap IS NOT NULL THEN 1 END) as registros_com_sap,
    COUNT(CASE WHEN data_finalizacao IS NOT NULL THEN 1 END) as registros_com_data_finalizacao
FROM embalagem_notas_bipadas;
