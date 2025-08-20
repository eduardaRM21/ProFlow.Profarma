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

-- 6. TESTAR INSERÇÃO DE DADOS COM NOVOS CAMPOS
-- =====================================================

-- Inserir dados de teste
INSERT INTO embalagem_notas_bipadas (
    numero_nf,
    codigo_completo,
    carro_id,
    session_id,
    colaboradores,
    data,
    turno,
    volumes,
    destino,
    fornecedor,
    tipo_carga,
    status,
    numeros_sap,
    data_finalizacao
) VALUES (
    'TEST_UPDATE_001',
    'TEST_UPDATE_CODE_001',
    'TEST_UPDATE_CARRO_001',
    'TEST_UPDATE_SESSION_001',
    'Teste Atualização',
    CURRENT_DATE,
    'A',
    1,
    'Teste Atualização',
    'Teste Atualização',
    'Teste Atualização',
    'teste_update',
    ARRAY['123456', '789012'],
    CURRENT_TIMESTAMP
);

-- 7. VERIFICAR DADOS INSERIDOS
-- =====================================================

SELECT 
    numero_nf,
    carro_id,
    numeros_sap,
    data_finalizacao,
    created_at,
    updated_at
FROM embalagem_notas_bipadas 
WHERE numero_nf = 'TEST_UPDATE_001';

-- 8. LIMPAR DADOS DE TESTE
-- =====================================================

DELETE FROM embalagem_notas_bipadas 
WHERE numero_nf = 'TEST_UPDATE_001';

-- 9. VERIFICAR SE A LIMPEZA FUNCIONOU
-- =====================================================

SELECT COUNT(*) as total_registros_teste
FROM embalagem_notas_bipadas 
WHERE numero_nf = 'TEST_UPDATE_001';

-- 10. RESUMO FINAL
-- =====================================================

SELECT 
    'ATUALIZAÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN numeros_sap IS NOT NULL THEN 1 END) as registros_com_sap,
    COUNT(CASE WHEN data_finalizacao IS NOT NULL THEN 1 END) as registros_com_data_finalizacao
FROM embalagem_notas_bipadas;
