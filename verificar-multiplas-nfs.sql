-- VERIFICAÇÃO E CORREÇÃO DE MÚLTIPLAS NFs
-- Execute este script para identificar e corrigir NFs que estão falhando na validação

-- ========================================
-- 1. VERIFICAÇÃO INICIAL
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '🔍 INICIANDO VERIFICAÇÃO DE MÚLTIPLAS NFs';
    RAISE NOTICE '⏰ Timestamp: %', NOW();
    RAISE NOTICE '📋 NFs conhecidas com problema: 000016498, 000002774';
END $$;

-- ========================================
-- 2. VERIFICAR NFs ESPECÍFICAS
-- ========================================
SELECT 
    '📋 VERIFICAÇÃO DE NFs ESPECÍFICAS' as secao,
    numero_nf,
    CASE 
        WHEN numero_nf = '000016498' THEN '✅ NF 000016498 - JÁ VERIFICADA'
        WHEN numero_nf = '000002774' THEN '🔍 NF 000002774 - NOVA VERIFICAÇÃO'
        ELSE 'ℹ️ Outra NF'
    END as status,
    id,
    codigo_completo,
    status as status_nf,
    created_at
FROM notas_fiscais 
WHERE numero_nf IN ('000016498', '000002774')
ORDER BY numero_nf;

-- ========================================
-- 3. VERIFICAR NFs RECENTES
-- ========================================
SELECT 
    '📅 NFs PROCESSADAS RECENTEMENTE' as secao,
    COUNT(*) as total_nfs,
    MIN(created_at) as mais_antiga,
    MAX(created_at) as mais_recente
FROM notas_fiscais 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ========================================
-- 4. VERIFICAR NFs POR STATUS
-- ========================================
SELECT 
    '📊 NFs POR STATUS' as secao,
    status,
    COUNT(*) as total,
    MIN(created_at) as mais_antiga,
    MAX(created_at) as mais_recente
FROM notas_fiscais 
GROUP BY status
ORDER BY total DESC;

-- ========================================
-- 5. VERIFICAR PROBLEMAS DE RELACIONAMENTO
-- ========================================
SELECT 
    '🔗 VERIFICAÇÃO DE RELACIONAMENTOS' as secao,
    'NFs sem relacionamento em relatórios' as info,
    COUNT(*) as total_nfs_orfas
FROM notas_fiscais nf
LEFT JOIN relatorio_notas rn ON nf.id = rn.nota_fiscal_id
WHERE rn.nota_fiscal_id IS NULL;

-- ========================================
-- 6. VERIFICAR NFs EM RELATÓRIOS
-- ========================================
    SELECT 
        '📊 NFs EM RELATÓRIOS' as secao,
        'NFs que estão em relatórios' as info,
        COUNT(DISTINCT nf.id) as total_nfs_em_relatorios
    FROM notas_fiscais nf
    INNER JOIN relatorio_notas rn ON nf.id = rn.nota_fiscal_id
    INNER JOIN relatorios r ON rn.relatorio_id = r.id;

-- ========================================
-- 7. VERIFICAR PROBLEMAS DE PERMISSÃO
-- ========================================
SELECT 
    '🔐 VERIFICAÇÃO DE PERMISSÕES' as secao,
    'Permissões na tabela notas_fiscais' as info,
    privilege_type,
    grantee,
    COUNT(*) as total
FROM information_schema.role_table_grants 
WHERE table_name = 'notas_fiscais'
GROUP BY privilege_type, grantee
ORDER BY privilege_type, grantee;

-- ========================================
-- 8. VERIFICAR PROBLEMAS DE RLS
-- ========================================
SELECT 
    '🛡️ VERIFICAÇÃO DE RLS' as secao,
    'Políticas RLS ativas' as info,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'notas_fiscais';

-- ========================================
-- 9. VERIFICAR PROBLEMAS DE TRIGGERS
-- ========================================
SELECT 
    '⚡ VERIFICAÇÃO DE TRIGGERS' as secao,
    'Triggers ativos' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'notas_fiscais';

-- ========================================
-- 10. TESTE DE BUSCA DIRETA
-- ========================================
SELECT 
    '🧪 TESTE DE BUSCA DIRETA' as secao,
    'Simulando busca do sistema' as info,
    '000016498' as nf_teste_1,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') as resultado_1,
    '000002774' as nf_teste_2,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000002774') as resultado_2;

-- ========================================
-- 11. VERIFICAR PROBLEMAS DE CACHE
-- ========================================
SELECT 
    '💾 VERIFICAÇÃO DE CACHE' as secao,
    'Dados recentes para verificar sincronização' as info,
    COUNT(*) as total_nfs_ultima_hora
FROM notas_fiscais 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- ========================================
-- 12. VERIFICAR PROBLEMAS DE ESTRUTURA
-- ========================================
SELECT 
    '🏗️ VERIFICAÇÃO DE ESTRUTURA' as secao,
    'Colunas obrigatórias' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notas_fiscais'
AND column_name IN ('id', 'numero_nf', 'codigo_completo', 'status')
ORDER BY ordinal_position;

-- ========================================
-- 13. RESUMO FINAL
-- ========================================
SELECT 
    '📊 RESUMO FINAL DA VERIFICAÇÃO' as secao,
    'Status das NFs problemáticas' as info,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') as nf_000016498,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000002774') as nf_000002774,
    (SELECT COUNT(*) FROM notas_fiscais) as total_nfs_tabela,
    CASE 
        WHEN (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf IN ('000016498', '000002774')) = 2 
        THEN '✅ AMBAS AS NFs ESTÃO NO BANCO'
        ELSE '❌ ALGUMA NF ESTÁ FALTANDO'
    END as status_geral;

-- ========================================
-- 14. INSTRUÇÕES PÓS-VERIFICAÇÃO
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 INSTRUÇÕES PÓS-VERIFICAÇÃO:';
    RAISE NOTICE '1. Verifique se AMBAS as NFs estão sendo encontradas';
    RAISE NOTICE '2. Se estiverem, o problema é na APLICAÇÃO, não no banco';
    RAISE NOTICE '3. Recarregue o sistema e teste novamente';
    RAISE NOTICE '4. Monitore os logs no console do navegador';
    RAISE NOTICE '';
    RAISE NOTICE '📞 Se o problema persistir:';
    RAISE NOTICE '- O problema está na aplicação/frontend';
    RAISE NOTICE '- Verifique conexão com Supabase';
    RAISE NOTICE '- Verifique código da função de validação';
    RAISE NOTICE '';
    RAISE NOTICE '✅ VERIFICAÇÃO CONCLUÍDA!';
END $$;
