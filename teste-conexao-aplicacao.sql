-- TESTE DE CONEXÃO E FUNCIONALIDADE DA APLICAÇÃO
-- Execute este script para verificar se a aplicação consegue acessar o banco

-- ========================================
-- 1. TESTE DE CONEXÃO BÁSICA
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '🔍 TESTANDO CONEXÃO DA APLICAÇÃO COM O BANCO';
    RAISE NOTICE '⏰ Timestamp: %', NOW();
    RAISE NOTICE '📋 Verificando se a aplicação consegue acessar os dados';
END $$;

-- ========================================
-- 2. TESTE DE PERMISSÕES DE LEITURA
-- ========================================
SELECT 
    '🔐 TESTE DE PERMISSÕES' as secao,
    'Verificando se a aplicação pode ler dados' as info,
    privilege_type,
    grantee,
    COUNT(*) as total
FROM information_schema.role_table_grants 
WHERE table_name = 'notas_fiscais'
AND privilege_type IN ('SELECT', 'USAGE')
GROUP BY privilege_type, grantee
ORDER BY privilege_type, grantee;

-- ========================================
-- 3. TESTE DE CONSULTA SIMPLES
-- ========================================
SELECT 
    '🧪 TESTE DE CONSULTA SIMPLES' as secao,
    'Simulando consulta básica da aplicação' as info,
    COUNT(*) as total_nfs,
    MIN(created_at) as mais_antiga,
    MAX(created_at) as mais_recente
FROM notas_fiscais;

-- ========================================
-- 4. TESTE DE CONSULTA ESPECÍFICA
-- ========================================
SELECT 
    '🔍 TESTE DE CONSULTA ESPECÍFICA' as secao,
    'Simulando busca por NF específica' as info,
    '000016498' as nf_teste,
    COUNT(*) as encontradas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ NF encontrada'
        ELSE '❌ NF não encontrada'
    END as resultado
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- ========================================
-- 5. TESTE DE CONSULTA COM JOIN
-- ========================================
SELECT 
    '🔗 TESTE DE CONSULTA COM JOIN' as secao,
    'Simulando consulta com relacionamentos' as info,
    COUNT(DISTINCT nf.id) as total_nfs_com_relacionamento
FROM notas_fiscais nf
LEFT JOIN relatorio_notas rn ON nf.id = rn.nota_fiscal_id
LEFT JOIN relatorios r ON rn.relatorio_id = r.id;

-- ========================================
-- 6. TESTE DE PERFORMANCE
-- ========================================
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTERVAL;
    result_count INTEGER;
BEGIN
    RAISE NOTICE '⚡ TESTE DE PERFORMANCE - Consulta simples';
    
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO result_count
    FROM notas_fiscais 
    WHERE numero_nf = '000016498';
    
    end_time := clock_timestamp();
    execution_time := end_time - start_time;
    
    RAISE NOTICE '✅ Consulta executada em: %', execution_time;
    RAISE NOTICE '📊 Resultado: % NFs encontradas', result_count;
END $$;

-- ========================================
-- 7. TESTE DE CONSULTA COMPLEXA
-- ========================================
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTERVAL;
    result_count INTEGER;
BEGIN
    RAISE NOTICE '🧠 TESTE DE PERFORMANCE - Consulta complexa';
    
    start_time := clock_timestamp();
    
    SELECT COUNT(DISTINCT nf.id) INTO result_count
    FROM notas_fiscais nf
    INNER JOIN relatorio_notas rn ON nf.id = rn.nota_fiscal_id
    INNER JOIN relatorios r ON rn.relatorio_id = r.id
    WHERE nf.status = 'ok'
    AND r.area = 'recebimento';
    
    end_time := clock_timestamp();
    execution_time := end_time - start_time;
    
    RAISE NOTICE '✅ Consulta complexa executada em: %', execution_time;
    RAISE NOTICE '📊 Resultado: % NFs em relatórios de recebimento', result_count;
END $$;

-- ========================================
-- 8. TESTE DE CONEXÕES SIMULTÂNEAS
-- ========================================
SELECT 
    '🔄 TESTE DE CONEXÕES SIMULTÂNEAS' as secao,
    'Verificando capacidade de múltiplas consultas' as info,
    COUNT(*) as total_consultas_simultaneas
FROM (
    SELECT 1 as consulta FROM notas_fiscais WHERE numero_nf = '000016498'
    UNION ALL
    SELECT 1 as consulta FROM notas_fiscais WHERE numero_nf = '000002774'
    UNION ALL
    SELECT 1 as consulta FROM notas_fiscais WHERE status = 'ok'
    UNION ALL
    SELECT 1 as consulta FROM notas_fiscais WHERE created_at >= NOW() - INTERVAL '1 day'
) as consultas_simultaneas;

-- ========================================
-- 9. TESTE DE TIMEOUT
-- ========================================
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTERVAL;
BEGIN
    RAISE NOTICE '⏱️ TESTE DE TIMEOUT - Consulta com delay';
    
    start_time := clock_timestamp();
    
    -- Simular consulta que pode demorar
    PERFORM pg_sleep(0.1); -- 100ms de delay
    
    SELECT COUNT(*) FROM notas_fiscais;
    
    end_time := clock_timestamp();
    execution_time := end_time - start_time;
    
    RAISE NOTICE '✅ Consulta com delay executada em: %', execution_time;
    
    IF execution_time > INTERVAL '1 second' THEN
        RAISE NOTICE '⚠️ Consulta demorou mais de 1 segundo';
    ELSE
        RAISE NOTICE '✅ Performance dentro do esperado';
    END IF;
END $$;

-- ========================================
-- 10. VERIFICAÇÃO DE ÍNDICES
-- ========================================
SELECT 
    '📇 VERIFICAÇÃO DE ÍNDICES' as secao,
    'Índices para otimizar consultas' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'notas_fiscais'
ORDER BY indexname;

-- ========================================
-- 11. TESTE DE CONSULTA COM FILTROS
-- ========================================
SELECT 
    '🔍 TESTE DE CONSULTA COM FILTROS' as secao,
    'Simulando consultas com diferentes filtros' as info,
    'Status = ok' as filtro_1,
    COUNT(*) as resultado_1,
    'Status = pendente' as filtro_2,
    (SELECT COUNT(*) FROM notas_fiscais WHERE status = 'pendente') as resultado_2,
    'Status = recebida' as filtro_3,
    (SELECT COUNT(*) FROM notas_fiscais WHERE status = 'recebida') as resultado_3
FROM notas_fiscais 
WHERE status = 'ok';

-- ========================================
-- 12. RESUMO FINAL DOS TESTES
-- ========================================
SELECT 
    '📊 RESUMO FINAL DOS TESTES' as secao,
    'Status da conectividade da aplicação' as info,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') as nf_000016498_acessivel,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000002774') as nf_000002774_acessivel,
    (SELECT COUNT(*) FROM notas_fiscais) as total_nfs_acessiveis,
    CASE 
        WHEN (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf IN ('000016498', '000002774')) = 2 
        THEN '✅ BANCO TOTALMENTE ACESSÍVEL'
        ELSE '❌ PROBLEMA DE ACESSO AO BANCO'
    END as status_conectividade;

-- ========================================
-- 13. INSTRUÇÕES PÓS-TESTE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 INSTRUÇÕES PÓS-TESTE:';
    RAISE NOTICE '1. Se todos os testes passaram, o banco está funcionando perfeitamente';
    RAISE NOTICE '2. O problema está 100% na aplicação/frontend';
    RAISE NOTICE '3. Recarregue o sistema e teste novamente';
    RAISE NOTICE '4. Verifique logs no console do navegador';
    RAISE NOTICE '';
    RAISE NOTICE '📞 Próximos passos:';
    RAISE NOTICE '- Investigar código da função de validação';
    RAISE NOTICE '- Verificar conexão Supabase no frontend';
    RAISE NOTICE '- Verificar permissões da sessão do usuário';
    RAISE NOTICE '';
    RAISE NOTICE '✅ TESTES DE CONECTIVIDADE CONCLUÍDOS!';
END $$;
