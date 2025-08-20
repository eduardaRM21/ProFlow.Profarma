-- =====================================================
-- CORREÇÃO DO CAMPO carro_id NA TABELA embalagem_notas_bipadas
-- =====================================================
-- Este script corrige o tipo do campo carro_id de UUID para VARCHAR(255)
-- Execute este script se você já criou a tabela com o tipo UUID incorreto

-- 1. Verificar se a tabela existe e qual é o tipo atual do campo carro_id
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'embalagem_notas_bipadas' 
    AND column_name = 'carro_id';

-- 2. Se o campo carro_id for do tipo UUID, alterar para VARCHAR(255)
-- Execute apenas se o resultado acima mostrar data_type = 'uuid'
ALTER TABLE embalagem_notas_bipadas 
ALTER COLUMN carro_id TYPE VARCHAR(255);

-- 3. Verificar se a alteração foi aplicada
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'embalagem_notas_bipadas' 
    AND column_name = 'carro_id';

-- 4. Verificar se há dados na tabela que possam ter causado problemas
SELECT COUNT(*) as total_registros
FROM embalagem_notas_bipadas;

-- 5. Verificar se há registros com carro_id inválido
SELECT 
    carro_id,
    numero_nf,
    codigo_completo
FROM embalagem_notas_bipadas 
WHERE carro_id IS NOT NULL 
LIMIT 10;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique os resultados de cada consulta
-- 3. Se o campo carro_id já for VARCHAR(255), não é necessário executar o ALTER TABLE
-- 4. Após a correção, teste novamente a funcionalidade de salvar notas bipadas
