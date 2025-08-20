-- =====================================================
-- CORREÇÃO RÁPIDA PARA DUPLICAÇÕES DE NOTAS
-- Execute este script para resolver o problema imediatamente
-- =====================================================

-- 1. Remover duplicações existentes
DELETE FROM relatorio_notas 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY relatorio_id, nota_fiscal_id 
                   ORDER BY created_at ASC
               ) as rn
        FROM relatorio_notas
    ) t
    WHERE t.rn > 1
);

-- 2. Adicionar constraint de unicidade
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'relatorio_notas_relatorio_id_nota_fiscal_id_key'
        AND table_name = 'relatorio_notas'
    ) THEN
        -- Adicionar constraint de unicidade
        ALTER TABLE relatorio_notas 
        ADD CONSTRAINT relatorio_notas_relatorio_id_nota_fiscal_id_key 
        UNIQUE (relatorio_id, nota_fiscal_id);
        
        RAISE NOTICE '✅ Constraint de unicidade adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Constraint de unicidade já existe.';
    END IF;
END $$;

-- 3. Verificar resultado
SELECT 
    '✅ CORREÇÃO APLICADA' as status,
    COUNT(*) as total_relacionamentos,
    COUNT(DISTINCT (relatorio_id, nota_fiscal_id)) as relacionamentos_unicos,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT (relatorio_id, nota_fiscal_id)) 
        THEN '✅ SUCESSO: Nenhuma duplicação'
        ELSE '❌ PROBLEMA: Ainda há duplicações'
    END as resultado
FROM relatorio_notas;
