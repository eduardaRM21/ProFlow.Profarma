-- Adicionar coluna total_divergencias na tabela relatorios
-- Esta coluna irá armazenar o total de divergências para otimizar a exibição nos cards

-- 1. Adicionar a coluna total_divergencias
ALTER TABLE relatorios 
ADD COLUMN IF NOT EXISTS total_divergencias INTEGER DEFAULT 0;

-- 2. Atualizar registros existentes com o total de divergências
UPDATE relatorios 
SET total_divergencias = (
    SELECT COUNT(*)
    FROM divergencias d
    INNER JOIN relatorio_notas rn ON d.nota_fiscal_id = rn.nota_fiscal_id
    WHERE rn.relatorio_id = relatorios.id
)
WHERE total_divergencias = 0;

-- 3. Adicionar comentário na coluna
COMMENT ON COLUMN relatorios.total_divergencias IS 'Total de divergências associadas ao relatório para otimizar exibição nos cards';

-- 4. Verificar se a coluna foi criada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'relatorios' 
AND column_name = 'total_divergencias';
