-- =====================================================
-- SCRIPT PARA DESABILITAR TRIGGERS TEMPORARIAMENTE
-- Execute este script se ainda houver duplicações após as correções
-- =====================================================

-- 1. Verificar triggers ativos
SELECT 
    '🔍 TRIGGERS ATIVOS' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('relatorio_notas', 'relatorio_colaboradores')
ORDER BY event_object_table, trigger_name;

-- 2. Desabilitar triggers temporariamente
DO $$
BEGIN
    -- Desabilitar trigger de relatorio_notas
    ALTER TABLE relatorio_notas DISABLE TRIGGER sync_relatorio_notas;
    RAISE NOTICE '✅ Trigger sync_relatorio_notas desabilitado temporariamente';
    
    -- Desabilitar trigger de relatorio_colaboradores
    ALTER TABLE relatorio_colaboradores DISABLE TRIGGER sync_relatorio_colaboradores;
    RAISE NOTICE '✅ Trigger sync_relatorio_colaboradores desabilitado temporariamente';
END $$;

-- 3. Verificar triggers desabilitados
SELECT 
    '🔧 TRIGGERS DESABILITADOS' as info,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('relatorio_notas', 'relatorio_colaboradores')
ORDER BY event_object_table, trigger_name;

-- 4. Para reabilitar os triggers posteriormente, execute:
/*
DO $$
BEGIN
    -- Reabilitar trigger de relatorio_notas
    ALTER TABLE relatorio_notas ENABLE TRIGGER sync_relatorio_notas;
    RAISE NOTICE '✅ Trigger sync_relatorio_notas reabilitado';
    
    -- Reabilitar trigger de relatorio_colaboradores
    ALTER TABLE relatorio_colaboradores ENABLE TRIGGER sync_relatorio_colaboradores;
    RAISE NOTICE '✅ Trigger sync_relatorio_colaboradores reabilitado';
END $$;
*/
