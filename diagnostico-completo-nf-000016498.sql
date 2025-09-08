-- DIAGNÓSTICO COMPLETO PARA NF 000016498
-- Execute este script para identificar exatamente onde está o problema

-- ========================================
-- 1. VERIFICAÇÃO INICIAL
-- ========================================
SELECT 
    '🔍 DIAGNÓSTICO INICIADO' as status,
    NOW() as timestamp;

-- ========================================
-- 2. VERIFICAÇÃO NA TABELA notas_fiscais
-- ========================================
SELECT 
    '📋 VERIFICAÇÃO NA TABELA notas_fiscais' as secao,
    'NF 000016498' as numero_buscado,
    COUNT(*) as total_encontradas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ NF ENCONTRADA'
        ELSE '❌ NF NÃO ENCONTRADA - PROBLEMA IDENTIFICADO'
    END as status
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- ========================================
-- 3. VERIFICAÇÃO COM VÁRIAS ABORDAGENS
-- ========================================
SELECT 
    '🔍 BUSCA COM VÁRIAS ABORDAGENS' as secao,
    '000016498' as numero_buscado,
    COUNT(*) as total_encontradas,
    'Busca exata por numero_nf' as tipo_busca
FROM notas_fiscais 
WHERE numero_nf = '000016498'

UNION ALL

SELECT 
    '🔍 BUSCA COM VÁRIAS ABORDAGENS' as secao,
    '000016498' as numero_buscado,
    COUNT(*) as total_encontradas,
    'Busca por codigo_completo contendo 16498' as tipo_busca
FROM notas_fiscais 
WHERE codigo_completo LIKE '%16498%'

UNION ALL

SELECT 
    '🔍 BUSCA COM VÁRIAS ABORDAGENS' as secao,
    '000016498' as numero_buscado,
    COUNT(*) as total_encontradas,
    'Busca case insensitive' as tipo_busca
FROM notas_fiscais 
WHERE LOWER(numero_nf) = LOWER('000016498')

UNION ALL

SELECT 
    '🔍 BUSCA COM VÁRIAS ABORDAGENS' as secao,
    '000016498' as numero_buscado,
    COUNT(*) as total_encontradas,
    'Busca por variações (16498, 0016498, etc)' as tipo_busca
FROM notas_fiscais 
WHERE numero_nf LIKE '%16498%'
   OR numero_nf LIKE '%0016498%'
   OR numero_nf LIKE '%00016498%';

-- ========================================
-- 4. VERIFICAÇÃO DE ESTRUTURA DA TABELA
-- ========================================
SELECT 
    '🏗️ ESTRUTURA DA TABELA notas_fiscais' as secao,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notas_fiscais'
ORDER BY ordinal_position;

-- ========================================
-- 5. VERIFICAÇÃO DE DADOS RECENTES
-- ========================================
SELECT 
    '📅 DADOS RECENTES NA TABELA notas_fiscais' as secao,
    COUNT(*) as total_registros,
    MIN(created_at) as registro_mais_antigo,
    MAX(created_at) as registro_mais_recente
FROM notas_fiscais;

-- ========================================
-- 6. VERIFICAÇÃO DE EXEMPLOS DE NFs
-- ========================================
SELECT 
    '📋 EXEMPLOS DE NFs NA TABELA' as secao,
    numero_nf,
    codigo_completo,
    created_at,
    status
FROM notas_fiscais 
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 7. VERIFICAÇÃO DE RELATÓRIOS
-- ========================================
SELECT 
    '📊 VERIFICAÇÃO EM RELATÓRIOS' as secao,
    'Relatórios que podem referenciar NF 000016498' as info,
    COUNT(*) as total_relatorios
FROM relatorios r
WHERE r.notas::text LIKE '%000016498%'
   OR r.notas::text LIKE '%16498%';

-- ========================================
-- 8. VERIFICAÇÃO DE RELACIONAMENTOS
-- ========================================
SELECT 
    '🔗 VERIFICAÇÃO DE RELACIONAMENTOS' as secao,
    'Relacionamentos quebrados' as info,
    COUNT(*) as total
FROM relatorio_notas rn
LEFT JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
WHERE nf.id IS NULL;

-- ========================================
-- 9. VERIFICAÇÃO DE PERMISSÕES
-- ========================================
SELECT 
    '🔐 VERIFICAÇÃO DE PERMISSÕES' as secao,
    'Permissões na tabela notas_fiscais' as info,
    COUNT(*) as total_permissoes
FROM information_schema.role_table_grants 
WHERE table_name = 'notas_fiscais';

-- ========================================
-- 10. VERIFICAÇÃO DE RLS
-- ========================================
SELECT 
    '🛡️ VERIFICAÇÃO DE RLS' as secao,
    'Políticas RLS na tabela notas_fiscais' as info,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE tablename = 'notas_fiscais';

-- ========================================
-- 11. VERIFICAÇÃO DE TRIGGERS
-- ========================================
SELECT 
    '⚡ VERIFICAÇÃO DE TRIGGERS' as secao,
    'Triggers na tabela notas_fiscais' as info,
    COUNT(*) as total_triggers
FROM information_schema.triggers 
WHERE event_object_table = 'notas_fiscais';

-- ========================================
-- 12. VERIFICAÇÃO DE CONSTRAINTS
-- ========================================
SELECT 
    '🔒 VERIFICAÇÃO DE CONSTRAINTS' as secao,
    'Constraints na tabela notas_fiscais' as info,
    COUNT(*) as total_constraints
FROM information_schema.table_constraints 
WHERE table_name = 'notas_fiscais';

-- ========================================
-- 13. TESTE DE INSERÇÃO SIMULADA
-- ========================================
SELECT 
    '🧪 TESTE DE INSERÇÃO SIMULADA' as secao,
    'Verificando se é possível inserir na tabela' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notas_fiscais' 
            AND column_name = 'numero_nf'
        ) THEN '✅ Coluna numero_nf existe'
        ELSE '❌ Coluna numero_nf não existe'
    END as status_coluna;

-- ========================================
-- 14. VERIFICAÇÃO DE ÍNDICES
-- ========================================
SELECT 
    '📇 VERIFICAÇÃO DE ÍNDICES' as secao,
    'Índices na tabela notas_fiscais' as info,
    COUNT(*) as total_indices
FROM pg_indexes 
WHERE tablename = 'notas_fiscais';

-- ========================================
-- 15. RESUMO FINAL
-- ========================================
SELECT 
    '📊 RESUMO FINAL DO DIAGNÓSTICO' as secao,
    'Status da NF 000016498' as info,
    CASE 
        WHEN (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') > 0 
        THEN '✅ NF ENCONTRADA - PROBLEMA RESOLVIDO'
        ELSE '❌ NF NÃO ENCONTRADA - NECESSÁRIA CORREÇÃO'
    END as status_final,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') as nf_encontradas,
    (SELECT COUNT(*) FROM notas_fiscais) as total_nfs_tabela;
