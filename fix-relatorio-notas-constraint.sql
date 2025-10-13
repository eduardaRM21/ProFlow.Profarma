-- =====================================================
-- CORREÇÃO: Adicionar constraint UNIQUE na tabela relatorio_notas
-- =====================================================

-- Verificar se a constraint já existe
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'relatorio_notas'::regclass
AND contype = 'u';

-- Adicionar constraint UNIQUE se não existir
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'relatorio_notas'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%relatorio_id%nota_fiscal_id%'
    ) THEN
        -- Adicionar a constraint UNIQUE
        ALTER TABLE relatorio_notas 
        ADD CONSTRAINT relatorio_notas_unique_relatorio_nota 
        UNIQUE (relatorio_id, nota_fiscal_id);
        
        RAISE NOTICE 'Constraint UNIQUE adicionada com sucesso na tabela relatorio_notas!';
    ELSE
        RAISE NOTICE 'Constraint UNIQUE já existe na tabela relatorio_notas!';
    END IF;
END $$;

-- Verificar se a constraint foi criada
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'relatorio_notas'::regclass
AND contype = 'u';

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'relatorio_notas'
ORDER BY ordinal_position;
