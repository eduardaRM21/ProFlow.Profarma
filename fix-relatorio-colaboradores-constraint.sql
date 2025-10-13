-- =====================================================
-- CORREÇÃO: Adicionar constraint UNIQUE na tabela relatorio_colaboradores
-- =====================================================

-- Verificar se a constraint já existe
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'relatorio_colaboradores'::regclass
AND contype = 'u';

-- Adicionar constraint UNIQUE se não existir
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'relatorio_colaboradores'::regclass 
        AND contype = 'u'
        AND pg_get_constraintdef(oid) LIKE '%relatorio_id%user_id%'
    ) THEN
        -- Adicionar a constraint UNIQUE
        ALTER TABLE relatorio_colaboradores 
        ADD CONSTRAINT relatorio_colaboradores_unique_relatorio_user 
        UNIQUE (relatorio_id, user_id);
        
        RAISE NOTICE 'Constraint UNIQUE adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Constraint UNIQUE já existe!';
    END IF;
END $$;

-- Verificar se a constraint foi criada
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'relatorio_colaboradores'::regclass
AND contype = 'u';

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'relatorio_colaboradores'
ORDER BY ordinal_position;
