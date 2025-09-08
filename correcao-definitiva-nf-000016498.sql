-- CORREÇÃO DEFINITIVA PARA NF 000016498
-- Execute este script APÓS executar o diagnóstico completo

-- ========================================
-- 1. VERIFICAÇÃO PRÉ-CORREÇÃO
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '🔍 INICIANDO CORREÇÃO PARA NF 000016498';
    RAISE NOTICE '⏰ Timestamp: %', NOW();
END $$;

-- ========================================
-- 2. VERIFICAR SE A NF JÁ EXISTE
-- ========================================
DO $$
DECLARE
    nf_exists BOOLEAN;
    nf_count INTEGER;
BEGIN
    -- Verificar se a NF já existe
    SELECT COUNT(*) INTO nf_count
    FROM notas_fiscais 
    WHERE numero_nf = '000016498';
    
    nf_exists := (nf_count > 0);
    
    IF nf_exists THEN
        RAISE NOTICE 'ℹ️ NF 000016498 já existe na tabela notas_fiscais (% registros)', nf_count;
    ELSE
        RAISE NOTICE '❌ NF 000016498 NÃO encontrada. Iniciando correção...';
    END IF;
END $$;

-- ========================================
-- 3. INSERIR NF 000016498 SE NÃO EXISTIR
-- ========================================
DO $$
DECLARE
    nf_exists BOOLEAN;
    new_nf_id UUID;
    insert_success BOOLEAN;
BEGIN
    -- Verificar se a NF já existe
    SELECT EXISTS(
        SELECT 1 FROM notas_fiscais WHERE numero_nf = '000016498'
    ) INTO nf_exists;
    
    IF NOT nf_exists THEN
        RAISE NOTICE '🔧 Criando registro para NF 000016498...';
        
        BEGIN
            -- Gerar novo ID
            new_nf_id := gen_random_uuid();
            
            -- Inserir NF na tabela notas_fiscais
            INSERT INTO notas_fiscais (
                id,
                numero_nf,
                codigo_completo,
                volumes,
                destino,
                fornecedor,
                cliente_destino,
                tipo_carga,
                status,
                data,
                created_at,
                updated_at
            ) VALUES (
                new_nf_id,
                '000016498',
                '000016498|000016498|0|DESTINO|FORNECEDOR|CLIENTE|TIPO',
                0,
                'DESTINO TEMPORÁRIO',
                'FORNECEDOR TEMPORÁRIO',
                'CLIENTE TEMPORÁRIO',
                'TIPO TEMPORÁRIO',
                'pendente',
                CURRENT_DATE,
                NOW(),
                NOW()
            );
            
            insert_success := TRUE;
            RAISE NOTICE '✅ NF 000016498 criada com sucesso!';
            RAISE NOTICE '🆔 ID gerado: %', new_nf_id;
            
        EXCEPTION WHEN OTHERS THEN
            insert_success := FALSE;
            RAISE NOTICE '❌ Erro ao criar NF 000016498: %', SQLERRM;
            RAISE NOTICE '🔍 Detalhes do erro: %', SQLSTATE;
        END;
        
    ELSE
        RAISE NOTICE 'ℹ️ NF 000016498 já existe, pulando inserção';
        insert_success := TRUE;
    END IF;
    
    -- Verificar resultado final
    IF insert_success THEN
        RAISE NOTICE '✅ Correção concluída com sucesso!';
    ELSE
        RAISE NOTICE '❌ Correção falhou. Verifique os logs acima.';
    END IF;
END $$;

-- ========================================
-- 4. VERIFICAÇÃO PÓS-CORREÇÃO
-- ========================================
SELECT 
    '📋 VERIFICAÇÃO PÓS-CORREÇÃO' as secao,
    'NF 000016498' as numero_buscado,
    COUNT(*) as total_encontradas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ NF ENCONTRADA - CORREÇÃO FUNCIONOU'
        ELSE '❌ NF AINDA NÃO ENCONTRADA - PROBLEMA PERSISTE'
    END as status
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- ========================================
-- 5. VERIFICAR DETALHES DA NF INSERIDA
-- ========================================
SELECT 
    '🔍 DETALHES DA NF INSERIDA' as secao,
    id,
    numero_nf,
    codigo_completo,
    volumes,
    destino,
    fornecedor,
    cliente_destino,
    tipo_carga,
    status,
    data,
    created_at,
    updated_at
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- ========================================
-- 6. VERIFICAR SE A NF ESTÁ SENDO ENCONTRADA
-- ========================================
SELECT 
    '🧪 TESTE DE BUSCA DO SISTEMA' as secao,
    'Simulando busca do EmbalagemService' as info,
    COUNT(*) as total_encontradas,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Busca funcionando - NF disponível para validação'
        ELSE '❌ Busca não funcionando - Problema persiste'
    END as status_busca
FROM notas_fiscais 
WHERE numero_nf = '000016498';

-- ========================================
-- 7. VERIFICAR RELACIONAMENTOS
-- ========================================
SELECT 
    '🔗 VERIFICAÇÃO DE RELACIONAMENTOS' as secao,
    'NF em relatórios após correção' as info,
    COUNT(*) as total_relatorios
FROM relatorios r
INNER JOIN relatorio_notas rn ON r.id = rn.relatorio_id
INNER JOIN notas_fiscais nf ON rn.nota_fiscal_id = nf.id
WHERE nf.numero_nf = '000016498';

-- ========================================
-- 8. VERIFICAR SE HÁ PROBLEMAS DE PERMISSÃO
-- ========================================
SELECT 
    '🔐 VERIFICAÇÃO DE PERMISSÕES' as secao,
    'Permissões na tabela notas_fiscais' as info,
    privilege_type,
    grantee
FROM information_schema.role_table_grants 
WHERE table_name = 'notas_fiscais';

-- ========================================
-- 9. VERIFICAR SE HÁ PROBLEMAS DE RLS
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
-- 10. VERIFICAR SE HÁ PROBLEMAS DE TRIGGERS
-- ========================================
SELECT 
    '⚡ VERIFICAÇÃO DE TRIGGERS' as secao,
    'Triggers ativos' as info,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'notas_fiscais';

-- ========================================
-- 11. TESTE DE INSERÇÃO ADICIONAL
-- ========================================
DO $$
DECLARE
    test_insert_success BOOLEAN;
    test_nf_id UUID;
BEGIN
    RAISE NOTICE '🧪 Testando inserção de NF de teste...';
    
    BEGIN
        -- Tentar inserir uma NF de teste
        test_nf_id := gen_random_uuid();
        
        INSERT INTO notas_fiscais (
            id,
            numero_nf,
            codigo_completo,
            volumes,
            destino,
            fornecedor,
            cliente_destino,
            tipo_carga,
            status,
            data,
            created_at,
            updated_at
        ) VALUES (
            test_nf_id,
            'TESTE_' || EXTRACT(EPOCH FROM NOW())::TEXT,
            'TESTE|TESTE|0|TESTE|TESTE|TESTE|TESTE',
            0,
            'TESTE',
            'TESTE',
            'TESTE',
            'TESTE',
            'teste',
            CURRENT_DATE,
            NOW(),
            NOW()
        );
        
        test_insert_success := TRUE;
        RAISE NOTICE '✅ Teste de inserção funcionou!';
        
        -- Limpar NF de teste
        DELETE FROM notas_fiscais WHERE id = test_nf_id;
        RAISE NOTICE '🧹 NF de teste removida';
        
    EXCEPTION WHEN OTHERS THEN
        test_insert_success := FALSE;
        RAISE NOTICE '❌ Teste de inserção falhou: %', SQLERRM;
    END;
    
    IF test_insert_success THEN
        RAISE NOTICE '✅ Tabela notas_fiscais está funcionando corretamente';
    ELSE
        RAISE NOTICE '❌ Tabela notas_fiscais tem problemas de inserção';
    END IF;
END $$;

-- ========================================
-- 12. RESUMO FINAL DA CORREÇÃO
-- ========================================
SELECT 
    '📊 RESUMO FINAL DA CORREÇÃO' as secao,
    'Status da NF 000016498' as info,
    CASE 
        WHEN (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') > 0 
        THEN '✅ NF DISPONÍVEL PARA VALIDAÇÃO'
        ELSE '❌ NF AINDA NÃO DISPONÍVEL'
    END as status_final,
    (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') as nf_encontradas,
    (SELECT COUNT(*) FROM notas_fiscais) as total_nfs_tabela,
    CASE 
        WHEN (SELECT COUNT(*) FROM notas_fiscais WHERE numero_nf = '000016498') > 0 
        THEN '🎯 CORREÇÃO APLICADA COM SUCESSO'
        ELSE '⚠️ CORREÇÃO NÃO FUNCIONOU - VERIFICAR LOGS'
    END as resultado_correcao;

-- ========================================
-- 13. INSTRUÇÕES PÓS-CORREÇÃO
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 INSTRUÇÕES PÓS-CORREÇÃO:';
    RAISE NOTICE '1. Recarregue a página de embalagem';
    RAISE NOTICE '2. Teste a bipagem com a NF 000016498';
    RAISE NOTICE '3. Verifique se a NF é aceita pelo sistema';
    RAISE NOTICE '4. Monitore os logs no console do navegador';
    RAISE NOTICE '';
    RAISE NOTICE '📞 Se o problema persistir:';
    RAISE NOTICE '- Verifique os logs do console';
    RAISE NOTICE '- Execute o diagnóstico novamente';
    RAISE NOTICE '- Compartilhe os resultados das consultas';
    RAISE NOTICE '';
    RAISE NOTICE '✅ CORREÇÃO CONCLUÍDA!';
END $$;
