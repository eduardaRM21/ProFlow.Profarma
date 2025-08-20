-- =====================================================
-- SCRIPT PARA VERIFICAR SE AS CORREÇÕES FUNCIONARAM
-- Execute este script após aplicar as correções
-- =====================================================

-- 1. Verificar se não há mais duplicações
SELECT 
    '🔍 VERIFICAÇÃO FINAL - DUPLICAÇÕES' as info,
    COUNT(*) as total_relacionamentos,
    COUNT(DISTINCT relatorio_id) as relatorios_unicos,
    COUNT(DISTINCT nota_fiscal_id) as notas_unicas,
    COUNT(*) - COUNT(DISTINCT (relatorio_id, nota_fiscal_id)) as duplicacoes_restantes
FROM relatorio_notas;

-- 2. Verificar constraint de unicidade
SELECT 
    '🔍 VERIFICAÇÃO DA CONSTRAINT' as info,
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'relatorio_notas' 
AND constraint_type = 'UNIQUE';

-- 3. Verificar função corrigida
SELECT 
    '🔍 VERIFICAÇÃO DA FUNÇÃO' as info,
    routine_name,
    routine_type,
    routine_definition LIKE '%DISTINCT%' as tem_distinct
FROM information_schema.routines 
WHERE routine_name = 'sync_relatorio_data';

-- 4. Verificar triggers
SELECT 
    '🔍 VERIFICAÇÃO DOS TRIGGERS' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('relatorio_notas', 'relatorio_colaboradores')
ORDER BY event_object_table, trigger_name;

-- 5. Teste de tentativa de duplicação (deve falhar)
DO $$
DECLARE
    test_relatorio_id UUID;
    test_nota_fiscal_id UUID;
BEGIN
    -- Pegar um exemplo existente
    SELECT relatorio_id, nota_fiscal_id 
    INTO test_relatorio_id, test_nota_fiscal_id
    FROM relatorio_notas 
    LIMIT 1;
    
    IF test_relatorio_id IS NOT NULL AND test_nota_fiscal_id IS NOT NULL THEN
        BEGIN
            -- Tentar inserir duplicação (deve falhar)
            INSERT INTO relatorio_notas (relatorio_id, nota_fiscal_id)
            VALUES (test_relatorio_id, test_nota_fiscal_id);
            
            RAISE NOTICE '❌ ERRO: Duplicação foi inserida (constraint não funcionou)';
        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE '✅ SUCESSO: Constraint de unicidade funcionando corretamente';
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ AVISO: Erro inesperado: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'ℹ️ INFO: Nenhum dado encontrado para teste';
    END IF;
END $$;

-- 6. Resumo final
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) - COUNT(DISTINCT (relatorio_id, nota_fiscal_id)) FROM relatorio_notas) = 0 
        THEN '✅ SUCESSO: Nenhuma duplicação encontrada'
        ELSE '❌ PROBLEMA: Ainda há duplicações'
    END as status_duplicacoes,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'relatorio_notas' AND constraint_type = 'UNIQUE'
        )
        THEN '✅ SUCESSO: Constraint de unicidade ativa'
        ELSE '❌ PROBLEMA: Constraint de unicidade não encontrada'
    END as status_constraint,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'sync_relatorio_data' 
            AND routine_definition LIKE '%DISTINCT%'
        )
        THEN '✅ SUCESSO: Função corrigida com DISTINCT'
        ELSE '❌ PROBLEMA: Função não foi corrigida'
    END as status_funcao;
